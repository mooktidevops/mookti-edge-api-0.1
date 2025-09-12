"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handler;
// Learning Paths List API - GET /api/learning-paths
require("../../lib/edge-polyfills");
const auth_native_1 = require("../../lib/auth-native");
exports.config = {
    runtime: 'edge',
    regions: ['iad1'],
};
const LEARNING_PATHS = {
    workplace_success: {
        id: 'workplace_success',
        name: 'Workplace Success',
        description: 'Cultural Intelligence Learning Path',
        version: '1.0.0',
        node_count: 200,
        estimated_duration: '4 hours',
        modules: [
            'intro',
            'cq_intro',
            'power_hierarchy',
            'dealing_with_unknowns',
            'consensus_building',
            'being_in_sync'
        ],
        start_node: '1'
    }
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
        // Return all learning paths
        const paths = Object.values(LEARNING_PATHS);
        return new Response(JSON.stringify({
            learning_paths: paths,
            total: paths.length,
            version: '1.0.0'
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            }
        });
    }
    catch (error) {
        console.error('Learning paths error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to fetch learning paths',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
