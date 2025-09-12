"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handler;
// Progress Sync API - POST /api/progress/sync
require("../../lib/edge-polyfills");
const auth_native_1 = require("../../lib/auth-native");
const kv_1 = require("@vercel/kv");
exports.config = {
    runtime: 'edge',
    regions: ['iad1'],
};
async function handler(req) {
    // Only allow POST requests
    if (req.method !== 'POST') {
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
        // Parse request body
        const body = await req.json();
        if (!body.path_id || !body.current_node) {
            return new Response(JSON.stringify({
                error: 'Missing required fields',
                required: ['path_id', 'current_node']
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // Get existing progress
        const progressKey = `progress_${userId}_${body.path_id}`;
        const existingProgress = await kv_1.kv.get(progressKey) || {
            total_time_spent: 0,
            completed_nodes: []
        };
        // Update progress
        const updatedProgress = {
            user_id: userId,
            path_id: body.path_id,
            current_node: body.current_node,
            completed_nodes: body.completed_nodes || existingProgress.completed_nodes,
            module_progress: body.module_progress || existingProgress.module_progress,
            last_updated: new Date().toISOString(),
            total_time_spent: existingProgress.total_time_spent + (body.time_spent || 0)
        };
        // Save to KV store with 30 day expiry
        await kv_1.kv.set(progressKey, updatedProgress, { ex: 2592000 });
        // Track daily active users
        const dailyKey = `daily_active_${new Date().toISOString().split('T')[0]}`;
        await kv_1.kv.sadd(dailyKey, userId);
        await kv_1.kv.expire(dailyKey, 86400); // Expire after 1 day
        return new Response(JSON.stringify({
            success: true,
            progress: updatedProgress
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    catch (error) {
        console.error('Progress sync error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to sync progress',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
