// Vector Search Edge Function
// Handles authenticated requests to Pinecone for similarity search

import { Pinecone } from '@pinecone-database/pinecone';
import { VoyageAIClient } from 'voyageai';
import { verifyFirebaseToken } from '../lib/auth-native';
import type { SearchRequest, SearchResult, ErrorResponse } from '../lib/types';

export const config = {
  runtime: 'edge',
  regions: ['iad1'], // US East for low latency
};

let pineconeClient: Pinecone | null = null;
let voyageClient: VoyageAIClient | null = null;

// Initialize Pinecone client
function getPineconeClient() {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.pinecone_api_key || '',
    });
  }
  return pineconeClient;
}

// Initialize Voyage AI client
function getVoyageClient() {
  if (!voyageClient) {
    voyageClient = new VoyageAIClient({
      apiKey: process.env.voyage_api_key || '',
    });
  }
  return voyageClient;
}

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

    // Parse request body
    const body: SearchRequest = await req.json();
    
    if (!body.query || !body.query.trim()) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: query',
          code: 'INVALID_REQUEST',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const topK = body.topK || 5;
    const startTime = Date.now();

    // Generate embedding for the query text using Voyage AI
    const voyage = getVoyageClient();
    const embeddingResponse = await voyage.embed({
      input: body.query,
      model: 'voyage-2', // Same model used for the indexed content
    });

    if (!embeddingResponse.data || embeddingResponse.data.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Failed to generate embedding',
          code: 'EMBEDDING_ERROR',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Connect to Pinecone index
    const pc = getPineconeClient();
    const index = pc.index('mookti-vectors');
    
    // Perform similarity search
    const queryResponse = await index.namespace('workplace-success').query({
      vector: queryEmbedding,
      topK,
      includeValues: false,
      includeMetadata: true,
    });

    const duration = Date.now() - startTime;

    // Format results
    const results: SearchResult[] = queryResponse.matches.map(match => ({
      id: match.id,
      content: match.metadata?.content || '',
      score: match.score || 0,
      metadata: match.metadata,
    }));

    // Log search request
    console.log(`Vector search by user ${userId}: ${results.length} results in ${duration}ms`);

    return new Response(
      JSON.stringify({ results }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${duration}ms`,
        },
      }
    );

  } catch (error: any) {
    console.error('Vector search error:', error);

    return new Response(
      JSON.stringify({
        error: 'Search service error',
        code: 'SEARCH_ERROR',
        details: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}