// Combined Chat Edge Function
// Performs vector search for context, then calls Claude API

import Anthropic from '@anthropic-ai/sdk';
import { Pinecone } from '@pinecone-database/pinecone';
import { VoyageAIClient } from 'voyageai';
// Using native Web Crypto API for Edge Runtime compatibility
import { verifyFirebaseToken } from '../lib/auth-native';

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
}

const anthropic = new Anthropic({
  apiKey: process.env.anthropic_api_key || '',
});

let pineconeClient: Pinecone | null = null;
let voyageClient: VoyageAIClient | null = null;

function getPineconeClient() {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.pinecone_api_key || '',
    });
  }
  return pineconeClient;
}

function getVoyageClient() {
  if (!voyageClient) {
    voyageClient = new VoyageAIClient({
      apiKey: process.env.voyage_api_key || '',
    });
  }
  return voyageClient;
}

// Helper function to detect query type
function detectQueryType(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Factual questions
  if (lowerMessage.includes('what is') || lowerMessage.includes('how do') || 
      lowerMessage.includes('when should') || lowerMessage.includes('where')) {
    return 'Factual';
  }
  
  // Emotional indicators
  if (lowerMessage.includes('nervous') || lowerMessage.includes('worried') || 
      lowerMessage.includes('excited') || lowerMessage.includes('frustrated') ||
      lowerMessage.includes('confused') || lowerMessage.includes('failed') ||
      lowerMessage.includes('bombed')) {
    return 'Emotional';
  }
  
  // Application questions
  if (lowerMessage.includes('my') || lowerMessage.includes('our') || 
      lowerMessage.includes('tomorrow') || lowerMessage.includes('next')) {
    return 'Application';
  }
  
  // Conceptual questions
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
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    const authResult = await verifyFirebaseToken(authHeader);
    
    if (!authResult.success) {
      return new Response(
        JSON.stringify(authResult.error),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = authResult.userId!;
    const body = await req.json() as ChatRequest;
    
    if (!body.message) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: message',
          code: 'INVALID_REQUEST',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let ragContext = '';
    
    // Perform RAG search if requested
    if (body.useRAG !== false) {
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
              .filter(match => match.score && match.score > 0.7) // Only include highly relevant content
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

    // Build structured conversation context
    const chatContext = body.chatHistory
      ?.slice(-6) // Last 6 messages
      .map(msg => `${msg.role === 'assistant' ? 'Ellen' : 'User'}: ${msg.content}`)
      .join('\n\n') || '';

    // Detect query type for appropriate response
    const queryType = detectQueryType(body.message);
    
    // Check if user is explicitly requesting to return to learning path
    const userRequestsReturn = /\b(continue|return|go back|back to|resume|let's move on|ready to continue|next)\b/i.test(body.message);
    
    // Construct structured prompt following Socratic guidelines
    let fullPrompt = '';
    
    if (chatContext) {
      fullPrompt += `<conversation_context>\n${chatContext}\n</conversation_context>\n\n`;
    }
    
    if (ragContext) {
      fullPrompt += `<relevant_content>${ragContext}\n</relevant_content>\n\n`;
    }
    
    fullPrompt += `<user_message>\nUser: ${body.message}\nQuery Type: ${queryType}${userRequestsReturn ? '\nUser Intent: Requesting to return/continue learning path' : ''}\n</user_message>\n\n`;
    
    fullPrompt += `<response_guidelines>\n- Answer direct questions clearly first\n- Include relevant data or research naturally\n- Follow with ONE focused question that moves dialogue forward\n- Keep questions at appropriate depth for user's engagement level\n- If creating aporia, frame as productive reflection, not confusion\n- When challenging assumptions, be empathetic and constructive\n</response_guidelines>`;

    // TODO: Migrate to Vercel AI SDK in post-MVP phase to enable:
    // - User model selection (Haiku/Sonnet/Opus)
    // - Streaming responses
    // - Unified tool handling across LLM providers
    // - Better error recovery and retry logic
    
    // Define learning-specific tools for Ellen
    const tools = [
      {
        name: "return_to_path",
        description: "Guide the conversation back to the learning path. Use when user's question has been addressed or when you want to continue the structured learning.",
        input_schema: {
          type: "object",
          properties: {
            transition_type: {
              type: "string",
              enum: ["answered_returning", "will_be_covered", "tangent_redirect"],
              description: "How to transition: answered_returning (question answered, returning to path), will_be_covered (acknowledge good question, it's coming up), tangent_redirect (gently redirect from off-topic)"
            },
            transition_message: {
              type: "string",
              description: "A smooth, conversational transition that connects the discussion back to the learning path"
            },
            conceptual_bridge: {
              type: "string",
              description: "How the user's question relates to the current or upcoming content"
            },
            user_requested: {
              type: "boolean",
              description: "Whether the user explicitly requested to return/continue the learning path"
            }
          },
          required: ["transition_type", "transition_message", "conceptual_bridge"]
        }
      },
      {
        name: "search_deeper",
        description: "Search for additional context beyond what's provided in the current RAG results. Use when user asks about something not fully covered in the available context.",
        input_schema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "What to search for in the extended learning materials"
            },
            search_scope: {
              type: "string",
              enum: ["current_module", "all_modules", "related_concepts"],
              description: "Where to search"
            },
            reason: {
              type: "string",
              description: "Why this additional context is needed"
            }
          },
          required: ["query", "search_scope", "reason"]
        }
      },
      {
        name: "suggest_comprehension_check",
        description: "Suggest a comprehension check when the user explicitly asks for practice or testing. This supplements (not replaces) the built-in expert-designed assessments in the learning path.",
        input_schema: {
          type: "object",
          properties: {
            concept: {
              type: "string",
              description: "The concept the user wants to practice or be tested on"
            },
            check_type: {
              type: "string",
              enum: ["practice_question", "application_scenario", "self_reflection"],
              description: "Type of supplemental check to offer"
            },
            question: {
              type: "string",
              description: "The practice question or scenario to present"
            },
            preface: {
              type: "string",
              description: "Introduction explaining this is supplemental practice, not replacing the course assessments"
            }
          },
          required: ["concept", "check_type", "question", "preface"]
        }
      },
      {
        name: "explain_differently",
        description: "Provide an alternative explanation using analogies, examples, or different perspectives. Use when the user seems to need a different approach.",
        input_schema: {
          type: "object",
          properties: {
            concept: {
              type: "string",
              description: "What concept to explain differently"
            },
            approach: {
              type: "string",
              enum: ["analogy", "real_world_example", "visual_description", "step_by_step", "comparison"],
              description: "How to explain it differently"
            },
            explanation: {
              type: "string",
              description: "The alternative explanation"
            }
          },
          required: ["concept", "approach", "explanation"]
        }
      }
    ];

    // Call Claude API with tools
    const startTime = Date.now();
    
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-20250514', // Upgraded to Opus 4 for best reasoning and tool use
      max_tokens: 2048,
      temperature: 0.6,
      system: buildEllenPrompt(body.currentNodeId, body.moduleProgress),
      tools: tools as any, // Type assertion for tools array
      tool_choice: { type: "auto" } as any, // Let Claude decide when to use tools
      messages: [
        {
          role: 'user',
          content: fullPrompt,
        },
      ],
    } as any);

    const duration = Date.now() - startTime;
    
    // Process response to separate text and tool calls
    const textContent = [];
    const toolCalls = [];
    
    for (const block of message.content) {
      if (block.type === 'text') {
        textContent.push(block.text);
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: (block as any).id,
          tool: (block as any).name,
          input: (block as any).input
        });
        
        // Log tool usage for debugging
        console.log(`Tool invoked: ${(block as any).name}`, (block as any).input);
      }
    }

    console.log(`Chat request by ${userId}: ${duration}ms, ${message.usage.input_tokens + message.usage.output_tokens} tokens, ${toolCalls.length} tool calls`);

    return new Response(
      JSON.stringify({
        content: textContent.join('\n'),
        model: message.model,
        usage: {
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
        },
        ragUsed: body.useRAG !== false,
        toolCalls: toolCalls, // Include tool calls in response
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${duration}ms`,
        },
      }
    );

  } catch (error: any) {
    console.error('Chat API error:', error);

    if (error.status === 429) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT',
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Chat service error',
        code: 'CHAT_ERROR',
        details: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}