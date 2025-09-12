"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handler;
// Progress Tracking API - GET /api/progress/[pathId]
require("../../lib/edge-polyfills");
const auth_native_1 = require("../../lib/auth-native");
const kv_1 = require("@vercel/kv");
exports.config = {
    runtime: 'edge',
    regions: ['iad1'],
};
async function handler(req) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    try {
        // Verify authentication
        const authHeader = req.headers.get('Authorization');
        const authResult = await (0, auth_native_1.verifyFirebaseToken)(authHeader);
        if (!authResult.success) {
            return new Response(JSON.stringify(authResult.error), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const userId = authResult.userId;
        // Extract path ID from URL
        const url = new URL(req.url);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        const pathId = pathSegments[pathSegments.length - 1];
        // Get progress from KV store
        const progressKey = `progress_${userId}_${pathId}`;
        const progress = await kv_1.kv.get(progressKey);
        if (!progress) {
            // Return default progress if none exists
            return new Response(JSON.stringify({
                user_id: userId,
                path_id: pathId,
                current_node: '1',
                completed_nodes: [],
                module_progress: {},
                last_updated: new Date().toISOString(),
                total_time_spent: 0
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return new Response(JSON.stringify(progress), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    catch (error) {
        console.error('Progress fetch error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to fetch progress',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
