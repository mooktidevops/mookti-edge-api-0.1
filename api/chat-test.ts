// Test endpoint for multi-provider AI chat (NO AUTH - DEV ONLY)
// ⚠️ WARNING: This endpoint has no authentication and should only be used for testing

import '../lib/edge-polyfills';
import { streamText, generateText } from 'ai';
import { routeToModel } from '../lib/ai/model-router';
import { AIProvider } from '../lib/ai/providers';

export const config = {
  runtime: 'edge',
};

interface ChatRequest {
  message: string;
  provider?: AIProvider;
  modelId?: string;
  stream?: boolean;
  chatHistory?: Array<{ role: string; content: string }>;
}

export default async function handler(req: Request): Promise<Response> {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not available in production', { status: 403 });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: ChatRequest = await req.json();
    const { message, provider = 'anthropic', modelId, stream = false, chatHistory = [] } = body;

    // Route to appropriate model
    const { model } = await routeToModel({
      provider,
      modelId,
      task: 'chat',
      userId: 'test-user',
    });

    // Build messages
    const messages = [
      ...chatHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ];

    if (stream) {
      const result = await streamText({
        model,
        messages,
        maxTokens: 1000,
      });

      // Return streaming response
      return new Response(result.toAIStream(), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      const result = await generateText({
        model,
        messages,
        maxTokens: 1000,
      });

      return new Response(result.text, {
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }
  } catch (error: any) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.toString(),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}