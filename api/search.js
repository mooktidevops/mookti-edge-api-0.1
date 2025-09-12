"use strict";
// Vector Search Edge Function
// Handles authenticated requests to Pinecone for similarity search
// Supports dual-namespace queries (public + user uploads)
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handler;
require("../lib/edge-polyfills");
const pinecone_1 = require("@pinecone-database/pinecone");
const voyageai_1 = require("voyageai");
const auth_native_1 = require("../lib/auth-native");
const manager_1 = require("../src/entitlements/manager");
exports.config = {
    runtime: 'edge',
    regions: ['iad1'], // US East for low latency
};
let pineconeClient = null;
let voyageClient = null;
// Initialize Pinecone client
function getPineconeClient() {
    if (!pineconeClient) {
        pineconeClient = new pinecone_1.Pinecone({
            apiKey: process.env.pinecone_api_key || '',
        });
    }
    return pineconeClient;
}
// Initialize Voyage AI client
function getVoyageClient() {
    if (!voyageClient) {
        voyageClient = new voyageai_1.VoyageAIClient({
            apiKey: process.env.voyage_api_key || '',
        });
    }
    return voyageClient;
}
async function handler(req) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200 });
    }
    // Only allow POST requests
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }
    try {
        // Verify Firebase auth token
        const authHeader = req.headers.get('Authorization');
        const authResult = await (0, auth_native_1.verifyFirebaseToken)(authHeader);
        if (!authResult.success) {
            return new Response(JSON.stringify(authResult.error), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        const userId = authResult.userId;
        // Parse request body
        const body = await req.json();
        if (!body.query || !body.query.trim()) {
            return new Response(JSON.stringify({
                error: 'Missing required field: query',
                code: 'INVALID_REQUEST',
            }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        const topK = body.topK || 5;
        const includeUserDocs = body.includeUserDocs !== false; // Default true
        const startTime = Date.now();
        // Get user entitlements
        const entitlements = await manager_1.EntitlementsManager.getInstance().getUserEntitlements(userId);
        // Check if user can access user docs
        if (includeUserDocs && !entitlements.plan.features.uploads_enabled) {
            // Silently exclude user docs if not entitled
            body.includeUserDocs = false;
        }
        // Generate embedding for the query text using Voyage AI
        const voyage = getVoyageClient();
        const embeddingResponse = await voyage.embed({
            input: body.query,
            model: 'voyage-large-2-instruct', // Updated model for better retrieval
        });
        if (!embeddingResponse.data || embeddingResponse.data.length === 0) {
            return new Response(JSON.stringify({
                error: 'Failed to generate embedding',
                code: 'EMBEDDING_ERROR',
            }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
        const queryEmbedding = embeddingResponse.data[0].embedding;
        // Connect to Pinecone index
        const pc = getPineconeClient();
        const index = pc.index('mookti-vectors');
        // Prepare namespaces to query
        const namespaces = ['public']; // Always search public content
        if (includeUserDocs && entitlements.plan.features.uploads_enabled) {
            namespaces.push(`u_${userId}`); // User-specific namespace
        }
        // Perform parallel similarity searches across namespaces
        const searchPromises = namespaces.map(namespace => index.namespace(namespace).query({
            vector: queryEmbedding,
            topK,
            includeValues: false,
            includeMetadata: true,
        }));
        const queryResponses = await Promise.all(searchPromises);
        const duration = Date.now() - startTime;
        // Merge and sort results from all namespaces
        const allMatches = queryResponses.flatMap((response, i) => response.matches.map(match => ({
            ...match,
            namespace: namespaces[i],
            is_user_source: namespaces[i].startsWith('u_'),
        })));
        // Sort by score and limit to topK
        allMatches.sort((a, b) => (b.score || 0) - (a.score || 0));
        const topMatches = allMatches.slice(0, topK);
        // Format results
        const results = topMatches.map(match => ({
            id: match.id,
            content: String(match.metadata?.content || match.metadata?.text || ''),
            score: match.score || 0,
            metadata: {
                ...match.metadata,
                is_user_source: match.is_user_source,
                namespace: match.namespace,
            },
        }));
        // Log usage for rate limiting
        await manager_1.EntitlementsManager.getInstance().logUsage(userId, 'search', 1);
        // Log search request
        console.log(`Vector search by user ${userId}: ${results.length} results from ${namespaces.join(', ')} in ${duration}ms`);
        return new Response(JSON.stringify({ results }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Response-Time': `${duration}ms`,
            },
        });
    }
    catch (error) {
        console.error('Vector search error:', error);
        return new Response(JSON.stringify({
            error: 'Search service error',
            code: 'SEARCH_ERROR',
            details: error.message,
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
