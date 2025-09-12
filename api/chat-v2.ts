// Migrated Chat Edge Function with Vercel AI SDK
// Supports multiple providers (Anthropic, OpenAI, Google)

import '../lib/edge-polyfills';
import { streamText, generateText } from 'ai';
import { z } from 'zod';
import { Pinecone } from '@pinecone-database/pinecone';
import { VoyageAIClient } from 'voyageai';
import { verifyFirebaseToken } from '../lib/auth-native';
import { verifyApiAuth } from '../lib/auth-middleware';
import { isDevMode, getDevUser } from '../lib/config/dev-mode';
import { routeToModel, ModelSelectionRequest } from '../lib/ai/model-router';
import { AIProvider } from '../lib/ai/providers';
import { getUserEntitlement, checkUsageLimits, EntitlementTier } from '../lib/ai/entitlements';
// Simple in-memory rate limiter
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // requests per window
type Bucket = { windowStart: number; count: number };
const buckets = new Map<string, Bucket>();

function getLimiterKey(req: Request): string {
  // Prefer dev user header or Authorization token for uniqueness
  const dev = req.headers.get('X-Dev-User-Id');
  const auth = req.headers.get('Authorization') || '';
  return dev || auth || 'anonymous';
}

function getRateLimiter() {
  return {
    consume(key: string, now: number) {
      const b = buckets.get(key);
      if (!b) {
        buckets.set(key, { windowStart: now, count: 1 });
        return true;
      }
      if (now - b.windowStart > RATE_LIMIT_WINDOW_MS) {
        b.windowStart = now;
        b.count = 1;
        return true;
      }
      if (b.count >= RATE_LIMIT_MAX) return false;
      b.count++;
      return true;
    },
  };
}

export const config = {
  runtime: 'edge',
  regions: ['iad1'], // US East for low latency
};

interface ChatRequest {
  message: string;
  chatHistory?: Array<{ role: string; content: string }>;
  useRAG?: boolean;
  topK?: number;
  currentNodeId?: string;
  moduleProgress?: {
    currentModule: string;
    nodesCompleted: number;
    totalNodes: number;
  };
  // New fields for provider selection
  provider?: AIProvider;
  modelId?: string;
  stream?: boolean; // Enable streaming responses
}

let pineconeClient: Pinecone | null = null;
let voyageClient: VoyageAIClient | null = null;

function getPineconeClient() {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });
  }
  return pineconeClient;
}

function getVoyageClient() {
  if (!voyageClient) {
    voyageClient = new VoyageAIClient({
      apiKey: process.env.VOYAGE_API_KEY || '',
    });
  }
  return voyageClient;
}

// Helper function to detect query type
function detectQueryType(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('what is') || lowerMessage.includes('how do') || 
      lowerMessage.includes('when should') || lowerMessage.includes('where')) {
    return 'Factual';
  }
  
  if (lowerMessage.includes('nervous') || lowerMessage.includes('worried') || 
      lowerMessage.includes('excited') || lowerMessage.includes('frustrated') ||
      lowerMessage.includes('confused') || lowerMessage.includes('failed') ||
      lowerMessage.includes('bombed')) {
    return 'Emotional';
  }
  
  if (lowerMessage.includes('my') || lowerMessage.includes('our') || 
      lowerMessage.includes('tomorrow') || lowerMessage.includes('next')) {
    return 'Application';
  }
  
  if (lowerMessage.includes('why') || lowerMessage.includes('difference between') || 
      lowerMessage.includes('compare') || lowerMessage.includes('versus')) {
    return 'Conceptual';
  }
  
  return 'General';
}

// Ellen's Socratic system prompt with tool awareness
const buildEllenPrompt = (nodeId?: string, progress?: ChatRequest['moduleProgress']) => {
  let progressContext = '';
  if (nodeId || progress) {
    progressContext = '\n\nCurrent Learning Context:\n';
    if (nodeId) {
      progressContext += `- Currently at node: ${nodeId}\n`;
    }
    if (progress) {
      progressContext += `- Module: ${progress.currentModule}\n`;
      progressContext += `- Progress: ${progress.nodesCompleted} of ${progress.totalNodes} nodes completed (${Math.round((progress.nodesCompleted / progress.totalNodes) * 100)}%)\n`;
    }
    progressContext += '\nUse this context to better gauge when to use the return_to_path tool and how to pace the learning experience.\n';
  }
  
  return `You are Ellen, a wise and friendly AI agent built to help college and post-graduate level learners understand complex topics in fresh ways. Your primary pedagogical method is elenchus, the Greek term for Socratic dialogue.

You are supporting learners through structured learning content. You have tools available to enhance the learning experience:
- Consider using return_to_path after each exchange to assess whether it's time to smoothly transition back to the learning materials
- When user explicitly requests to continue/return to learning (indicated in User Intent), set user_requested: true in return_to_path tool
- Use search_deeper when users ask about topics that need additional context beyond what's immediately available
- Use suggest_comprehension_check ONLY when users explicitly request practice or testing
- Use explain_differently when learners seem confused or request alternative explanations
${progressContext}
As part of this approach to fostering student learning, you should:
- Offer concise and clear insight as you move users toward and through aporia—moments of pause and reflection that consolidate lessons already given while stimulating wonder and a drive to learn more
- Where students offer clear signs of emotional state, be sure to be a supportive mentor who celebrates small wins and an empathetic listener who validates feelings
- When answering, ground your responses in data and cite research concisely
- Reference specific examples from the provided content where relevant
- Balance deep exploration of topics with awareness of the structured learning journey

Your Practical Socratic approach means:
• Provide direct, helpful answers FIRST when users ask specific questions
• Follow answers with focused, accessible questions that deepen understanding
• Challenge assumptions gently and progressively, not abruptly
• Use clarifying questions to ensure you understand their needs
• Build critical thinking through incremental steps, not philosophical leaps
• Keep the dialogue moving forward with engaging, relevant prompts`;
};

// Tools temporarily disabled due to type mismatch with current AI SDK.
// Re-enable with correct schema definition after upgrade.

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200 });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Basic per-user rate limiting (token bucket: max 30 req/min)
    const now = Date.now();
    const limiter = getRateLimiter();
    const idForLimit = getLimiterKey(req);
    const allowed = limiter.consume(idForLimit, now);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Too Many Requests', code: 'RATE_LIMIT' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    // Verify auth (dev mode bypass supported)
    let userId: string;
    if (isDevMode(req as unknown as Request)) {
      const dev = getDevUser(req as unknown as Request);
      userId = dev?.id || 'dev-user-default';
    } else {
      const authResult = await verifyApiAuth(req as unknown as any);
      if (!authResult.success) {
        return new Response(
          JSON.stringify(authResult.error),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      userId = authResult.userId!;
    }
    const body = await req.json() as ChatRequest;
    console.log('[edge chat-v2] incoming model selection', { provider: body.provider, modelId: body.modelId, stream: body.stream });
    console.log('[edge chat-v2] incoming model selection', { provider: body.provider, modelId: body.modelId, stream: body.stream });
    
    if (!body.message) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: message',
          code: 'INVALID_REQUEST',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user entitlements (mock for now, would come from database)
    const userTier: EntitlementTier = 'pro'; // TODO: Get from user profile
    const entitlements = getUserEntitlement(userTier);

    // Route to appropriate model based on user selection and entitlements
    const modelRequest: ModelSelectionRequest = {
      provider: body.provider,
      modelId: body.modelId,
      tier: 2 as const, // Default to tier 2 (balanced)
    };

    let modelRouting;
    try {
      modelRouting = routeToModel(modelRequest);
    } catch (error: any) {
      console.error('[edge chat-v2] model routing failed', { provider: body.provider, modelId: body.modelId, message: error.message });
      return new Response(
        JSON.stringify({
          error: 'Model routing failed',
          message: error.message,
          code: 'MODEL_ROUTING_ERROR',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let ragContext = '';
    
    // Perform RAG search if requested and user has entitlement
    if (body.useRAG !== false && entitlements.features.ragEnabled) {
      try {
        // Generate embedding for the user's message
        const voyage = getVoyageClient();
        const embeddingResponse = await voyage.embed({
          input: body.message,
          model: 'voyage-2',
        });

        if (embeddingResponse.data && embeddingResponse.data.length > 0) {
          const queryEmbedding = embeddingResponse.data[0].embedding;
          
          // Search for relevant content
          const pc = getPineconeClient();
          const index = pc.index('mookti-vectors');
          const queryResponse = await index.namespace('workplace-success').query({
            vector: queryEmbedding as number[],
            topK: body.topK || 3,
            includeValues: false,
            includeMetadata: true,
          });

          // Build context from search results with source attribution
          if (queryResponse.matches.length > 0) {
            const contextItems = queryResponse.matches
              .filter(match => match.score && match.score > 0.7)
              .map(match => {
                const content = match.metadata?.content || '';
                const source = match.metadata?.source || 'Learning Material';
                return content ? `[${source}]\n${content}` : '';
              })
              .filter(content => content.length > 0);
            
            if (contextItems.length > 0) {
              ragContext = '\n\n' + contextItems.join('\n\n---\n\n');
            }
          }
        }
      } catch (error) {
        console.error('RAG search failed:', error);
        // Continue without RAG context
      }
    }

    // Build conversation history
    const messages = [];
    
    // Add chat history if provided
    if (body.chatHistory && body.chatHistory.length > 0) {
      for (const msg of body.chatHistory.slice(-6)) { // Last 6 messages
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
          content: msg.content,
        });
      }
    }

    // Detect query type and user intent
    const queryType = detectQueryType(body.message);
    const userRequestsReturn = /\b(continue|return|go back|back to|resume|let's move on|ready to continue|next)\b/i.test(body.message);
    
    // Construct current message with context
    let currentMessage = '';
    
    if (ragContext) {
      currentMessage += `<relevant_content>${ragContext}\n</relevant_content>\n\n`;
    }
    
    currentMessage += `<user_message>\nUser: ${body.message}\nQuery Type: ${queryType}${userRequestsReturn ? '\nUser Intent: Requesting to return/continue learning path' : ''}\n</user_message>\n\n`;
    
    currentMessage += `<response_guidelines>\n- Answer direct questions clearly first\n- Include relevant data or research naturally\n- Follow with ONE focused question that moves dialogue forward\n- Keep questions at appropriate depth for user's engagement level\n- If creating aporia, frame as productive reflection, not confusion\n- When challenging assumptions, be empathetic and constructive\n</response_guidelines>`;

    messages.push({
      role: 'user' as const,
      content: currentMessage,
    });

    const startTime = Date.now();

    // Use streaming or non-streaming based on request
    if (body.stream) {
      // Streaming response
      const result = await streamText({
        model: modelRouting.model,
        system: buildEllenPrompt(body.currentNodeId, body.moduleProgress),
        messages,
        // tools disabled temporarily
        temperature: 0.6,
        maxRetries: 2048,
      });

      // Return streaming response
      const response = new Response(result.toTextStreamResponse().body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
      return response;
    } else {
      // Non-streaming response
      const result = await generateText({
        model: modelRouting.model,
        system: buildEllenPrompt(body.currentNodeId, body.moduleProgress),
        messages,
        // tools disabled temporarily
        temperature: 0.6,
        maxRetries: 2048,
      });

      const duration = Date.now() - startTime;

      console.log(`Chat request by ${userId}: ${duration}ms, ${modelRouting.provider}/${modelRouting.modelId}, ${result.usage?.totalTokens || 0} tokens, ${result.toolCalls?.length || 0} tool calls`);

      return new Response(
        JSON.stringify({
          content: result.text,
          model: modelRouting.modelId,
          provider: modelRouting.provider,
          usage: {
            input_tokens: result.usage?.totalTokens || 0,
            output_tokens: result.usage?.totalTokens || 0,
          },
          ragUsed: body.useRAG !== false && entitlements.features.ragEnabled,
          toolCalls: result.toolCalls,
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
