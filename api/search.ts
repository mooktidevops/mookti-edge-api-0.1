// Vector Search Edge Function
// Handles authenticated requests to Pinecone for similarity search

import { Pinecone } from '@pinecone-database/pinecone';
import { verifyFirebaseToken } from '../lib/auth';
import type { SearchRequest, SearchResult, ErrorResponse } from '../lib/types';

export const config = {
  runtime: 'edge',
  regions: ['iad1'], // US East for low latency
};

let pineconeClient: Pinecone | null = null;

// Initialize Pinecone client
function getPineconeClient() {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.pinecone_api_key || '',
    });
  }
  return pineconeClient;
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

    // For the search endpoint, we expect the query to already be an embedding
    // In a full implementation, you might call Voyage AI here to generate embeddings
    // For now, we'll assume the client sends the embedding as the query
    
    const topK = body.topK || 5;
    const startTime = Date.now();

    // Connect to Pinecone index
    const pc = getPineconeClient();
    const index = pc.index('mookti-vectors'); // Your index name
    
    // Perform similarity search
    // Note: In production, you'd generate the embedding from the query text
    // For now, this is a placeholder that expects pre-computed embeddings
    const queryResponse = await index.namespace('workplace-success').query({
      vector: JSON.parse(body.query), // Expecting embedding array as JSON string
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