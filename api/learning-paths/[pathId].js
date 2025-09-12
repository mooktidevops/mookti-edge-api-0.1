"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handler;
// Learning Path Detail API - GET /api/learning-paths/[pathId]
require("../../lib/edge-polyfills");
const auth_native_1 = require("../../lib/auth-native");
exports.config = {
    runtime: 'edge',
    regions: ['iad1'],
};
// Mock learning path data - would come from database in production
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
        start_node: '1',
        // Sample nodes for the path
        nodes: {
            '1': {
                id: '1',
                module: 'intro',
                type: 'lesson',
                title: 'Welcome to Workplace Success',
                content_id: 'CORE-WORKPLACE-intro-001',
                next: ['2'],
                prerequisites: []
            },
            '2': {
                id: '2',
                module: 'cq_intro',
                type: 'lesson',
                title: 'Understanding Cultural Intelligence',
                content_id: 'CORE-WORKPLACE-cq-002',
                next: ['3', '4'],
                prerequisites: ['1']
            }
        }
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
        // Extract path ID from URL
        const url = new URL(req.url);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        const pathId = pathSegments[pathSegments.length - 1];
        // Check if path exists
        const learningPath = LEARNING_PATHS[pathId];
        if (!learningPath) {
            return new Response(JSON.stringify({
                error: 'Learning path not found',
                path_id: pathId
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // Check if content should be included
        const includeContent = url.searchParams.get('include_content') === 'true';
        const nodeRadius = parseInt(url.searchParams.get('radius') || '0');
        // Prepare response
        const response = {
            ...learningPath
        };
        // Include full node content if requested
        if (includeContent) {
            response.nodes = learningPath.nodes;
        }
        return new Response(JSON.stringify(response), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            }
        });
    }
    catch (error) {
        console.error('Learning path detail error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to fetch learning path',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
