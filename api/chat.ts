// Combined Chat Edge Function
// Performs vector search for context, then calls Claude API

import Anthropic from '@anthropic-ai/sdk';
import { Pinecone } from '@pinecone-database/pinecone';
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

function getPineconeClient() {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.pinecone_api_key || '',
    });
  }
  return pineconeClient;
}

// Ellen's system prompt (matching the iOS app)
const ELLEN_SYSTEM_PROMPT = `You are Ellen, a warm, encouraging learning companion helping someone master workplace cultural intelligence. Your personality:
- Supportive and empathetic mentor
- Clear, conversational communication
- Use relatable examples and stories
- Acknowledge emotions and challenges
- Celebrate progress enthusiastically

Focus on practical application and building confidence. Keep responses concise but warm.`;

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
        // TODO: In production, generate embedding from body.message using Voyage AI
        // For now, we'll skip the vector search
        
        // const pc = getPineconeClient();
        // const index = pc.index('mookti-vectors');
        // const queryResponse = await index.namespace('workplace-success').query({...});
        
        // Placeholder RAG context
        ragContext = '\n\nLibrary Context:\n[RAG functionality will be implemented with Voyage AI embeddings]';
      } catch (error) {
        console.error('RAG search failed:', error);
        // Continue without RAG context
      }
    }

    // Build chat history context
    const chatContext = body.chatHistory
      ?.slice(-6) // Last 6 messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n') || '';

    // Construct full prompt
    const fullPrompt = `${chatContext ? `Chat Context:\n${chatContext}\n\n` : ''}${ragContext}\n\nUser: ${body.message}`;

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