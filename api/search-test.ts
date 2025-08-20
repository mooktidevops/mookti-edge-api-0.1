// Test endpoint for search API - NO AUTHENTICATION
// This is for testing only and should be removed before production

import '../lib/edge-polyfills';
import { Pinecone } from '@pinecone-database/pinecone';
import { VoyageAIClient } from 'voyageai';

export const config = {
  runtime: 'edge',
  regions: ['iad1'],
};

export default async function handler(req: Request) {
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }

  try {
    const body = await req.json() as any;
    
    if (!body.query || !body.query.trim()) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: query',
          code: 'INVALID_REQUEST',
        }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    const topK = body.topK || 5;
    const namespace = body.namespace || 'public';
    
    console.log(`🔍 Test search: "${body.query}" in namespace "${namespace}"`);

    // Initialize clients
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    
    const voyage = new VoyageAIClient({
      apiKey: process.env.VOYAGE_API_KEY!,
    });

    // Generate embedding
    const embeddingResponse = await voyage.embed({
      input: body.query,
      model: 'voyage-large-2-instruct',
    });

    if (!embeddingResponse.data || embeddingResponse.data.length === 0) {
      throw new Error('Failed to generate embedding');
    }

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search Pinecone
    const index = pinecone.index('mookti-vectors');
    const queryResponse = await index.namespace(namespace).query({
      vector: queryEmbedding as number[],
      topK,
      includeValues: false,
      includeMetadata: true,
    });

    // Format results
    const results = queryResponse.matches.map(match => ({
      id: match.id,
      content: String(match.metadata?.text || ''),
      score: match.score || 0,
      metadata: {
        ...match.metadata,
        namespace,
      },
    }));

    console.log(`✅ Found ${results.length} results`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        query: body.query,
        namespace,
        count: results.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Search test error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Search failed',
        code: 'SEARCH_ERROR',
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}