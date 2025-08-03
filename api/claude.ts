// Claude API Edge Function
// Handles authenticated requests to Claude API with rate limiting

import Anthropic from '@anthropic-ai/sdk';
import { verifyFirebaseToken, checkRateLimit } from '../lib/auth-manual';
import type { ClaudeRequest, ClaudeResponse, ErrorResponse } from '../lib/types';

export const config = {
  runtime: 'edge',
  regions: ['iad1'], // US East for low latency
};

const anthropic = new Anthropic({
  apiKey: process.env.anthropic_api_key || '',
});

export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200 });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify Firebase auth token
    const authHeader = req.headers.get('Authorization');
    const authResult = await verifyFirebaseToken(authHeader);
    
    if (!authResult.success) {
      return new Response(
        JSON.stringify(authResult.error),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = authResult.userId!;
    const userEmail = authResult.email!;

    // Check rate limit
    const rateLimitOk = await checkRateLimit(userId);
    if (!rateLimitOk) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          details: 'Please try again later',
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: ClaudeRequest = await req.json();
    
    if (!body.prompt) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: prompt',
          code: 'INVALID_REQUEST',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Log request (without sensitive data)
    console.log(`Claude API request from user ${userId} (${userEmail})`);

    // Call Claude API
    const startTime = Date.now();
    
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: body.maxTokens || 2048,
      temperature: body.temperature || 0.6,
      system: body.systemPrompt,
      messages: [
        {
          role: 'user',
          content: body.prompt,
        },
      ],
    });

    const duration = Date.now() - startTime;

    // Extract text content from the response
    const textContent = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    // Prepare response
    const response: ClaudeResponse = {
      content: textContent,
      model: message.model,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    };

    // Log usage for monitoring
    console.log(`Claude API response: ${duration}ms, ${message.usage.input_tokens + message.usage.output_tokens} tokens`);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${duration}ms`,
        },
      }
    );

  } catch (error: any) {
    console.error('Claude API error:', error);

    // Handle Anthropic API errors
    if (error.status === 401) {
      return new Response(
        JSON.stringify({
          error: 'Invalid API key',
          code: 'INVALID_API_KEY',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (error.status === 429) {
      return new Response(
        JSON.stringify({
          error: 'Claude API rate limit exceeded',
          code: 'UPSTREAM_RATE_LIMIT',
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generic error response
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}