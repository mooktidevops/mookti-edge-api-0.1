// Combined Chat Edge Function
// Performs vector search for context, then calls Claude API

import Anthropic from '@anthropic-ai/sdk';
import { Pinecone } from '@pinecone-database/pinecone';
import { VoyageAIClient } from 'voyageai';
// Using JWKS-based auth to fix Edge Runtime compatibility
import { verifyFirebaseToken } from '../lib/auth';

export const config = {
  runtime: 'edge',
  regions: ['iad1'], // US East for low latency
};

interface ChatRequest {
  message: string;
  chatHistory?: Array<{ role: string; content: string }>;
  useRAG?: boolean;
  topK?: number;
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

// Ellen's Socratic system prompt
const ELLEN_SYSTEM_PROMPT = `You are Ellen, a wise and friendly AI agent built to help college and post-graduate level learners understand complex topics in fresh ways. Your primary pedagogical method is elenchus, the Greek term for Socratic dialogue. 

As part of this approach to fostering student learning, you should:
- Offer concise and clear insight as you move users toward and through aporia—moments of pause and reflection that consolidate lessons already given while stimulating wonder and a drive to learn more
- Where students offer clear signs of emotional state, be sure to be a supportive mentor who celebrates small wins and an empathetic listener who validates feelings
- When answering, ground your responses in data and cite research concisely
- Reference specific examples from the provided content where relevant

Your Practical Socratic approach means:
• Provide direct, helpful answers FIRST when users ask specific questions
• Follow answers with focused, accessible questions that deepen understanding
• Challenge assumptions gently and progressively, not abruptly
• Use clarifying questions to ensure you understand their needs
• Build critical thinking through incremental steps, not philosophical leaps
• Keep the dialogue moving forward with engaging, relevant prompts`;

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
    const body: ChatRequest = await req.json();
    
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
            vector: queryEmbedding,
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
    
    // Construct structured prompt following Socratic guidelines
    let fullPrompt = '';
    
    if (chatContext) {
      fullPrompt += `<conversation_context>\n${chatContext}\n</conversation_context>\n\n`;
    }
    
    if (ragContext) {
      fullPrompt += `<relevant_content>${ragContext}\n</relevant_content>\n\n`;
    }
    
    fullPrompt += `<user_message>\nUser: ${body.message}\nQuery Type: ${queryType}\n</user_message>\n\n`;
    
    fullPrompt += `<response_guidelines>\n- Answer direct questions clearly first\n- Include relevant data or research naturally\n- Follow with ONE focused question that moves dialogue forward\n- Keep questions at appropriate depth for user's engagement level\n- If creating aporia, frame as productive reflection, not confusion\n- When challenging assumptions, be empathetic and constructive\n</response_guidelines>`;

    // Call Claude API
    const startTime = Date.now();
    
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2048,
      temperature: 0.6,
      system: ELLEN_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: fullPrompt,
        },
      ],
    });

    const duration = Date.now() - startTime;
    const textContent = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    console.log(`Chat request by ${userId}: ${duration}ms, ${message.usage.input_tokens + message.usage.output_tokens} tokens`);

    return new Response(
      JSON.stringify({
        content: textContent,
        model: message.model,
        usage: {
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
        },
        ragUsed: body.useRAG !== false,
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