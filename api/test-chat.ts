/**
 * Test Chat Endpoint - For development testing only
 * Bypasses auth to allow direct chat testing
 */

import { generateText, streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

export const runtime = 'edge';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json() as any;
    const { messages, provider = 'openai', stream = true } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Select model based on provider
    let model;
    switch (provider) {
      case 'anthropic':
        model = anthropic('claude-3-haiku-20240307');
        break;
      case 'google':
        model = google('gemini-1.5-flash');
        break;
      case 'openai':
      default:
        model = openai('gpt-4o-mini');
        break;
    }

    console.log(`Test chat using ${provider}...`);

    if (stream) {
      const result = await streamText({
        model,
        messages,
        temperature: 0.7,
      });

      // Return streaming response
      return result.toTextStreamResponse();
    } else {
      const result = await generateText({
        model,
        messages,
        temperature: 0.7,
      });

      return new Response(
        JSON.stringify({
          content: result.text,
          provider,
          model: model.modelId,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error: any) {
    console.error('Test chat error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Chat failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}