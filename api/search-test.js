"use strict";
// Test endpoint for search API - NO AUTHENTICATION
// This is for testing only and should be removed before production
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handler;
require("../lib/edge-polyfills");
const pinecone_1 = require("@pinecone-database/pinecone");
const voyageai_1 = require("voyageai");
exports.config = {
    runtime: 'edge',
    regions: ['iad1'],
};
async function handler(req) {
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
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
    try {
        const body = await req.json();
        if (!body.query || !body.query.trim()) {
            return new Response(JSON.stringify({
                error: 'Missing required field: query',
                code: 'INVALID_REQUEST',
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }
        const topK = body.topK || 5;
        const namespace = body.namespace || 'public';
        console.log(`🔍 Test search: "${body.query}" in namespace "${namespace}"`);
        // Initialize clients
        const pinecone = new pinecone_1.Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });
        const voyage = new voyageai_1.VoyageAIClient({
            apiKey: process.env.VOYAGE_API_KEY,
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
            vector: queryEmbedding,
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
        return new Response(JSON.stringify({
            success: true,
            results,
            query: body.query,
            namespace,
            count: results.length,
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
            },
        });
    }
    catch (error) {
        console.error('Search test error:', error);
        return new Response(JSON.stringify({
            error: 'Search failed',
            code: 'SEARCH_ERROR',
            details: error.message,
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
            },
        });
    }
}
