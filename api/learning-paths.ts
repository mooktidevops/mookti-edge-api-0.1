// Learning Path Management API
// Provides structured learning content with versioning and prefetch support

import { verifyFirebaseToken } from '../lib/auth-native';

export const config = {
  runtime: 'edge',
  regions: ['iad1'], // US East for low latency
};

// This would typically come from a database or CMS
// For MVP, we'll define the structure here
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

// Sample node structure - in production, this would be loaded from a database
const SAMPLE_NODES = {
  '1': {
    id: '1',
    type: 'system',
    content: 'Welcome to the Workplace Success learning path...',
    next_nodes: ['2'],
    prefetch_depth: 3,
    module: 'intro'
  },
  '2': {
    id: '2',
    type: 'system',
    content: 'In this journey, you will explore cultural intelligence...',
    next_nodes: ['3'],
    prefetch_depth: 3,
    module: 'intro'
  }
  // Additional nodes would be loaded from database
};

interface LearningPathRequest {
  path_id?: string;
  node_id?: string;
  radius?: number;
  include_content?: boolean;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    const authResult = await verifyFirebaseToken(authHeader);
    
    if (!authResult.success) {
      return new Response(
        JSON.stringify(authResult.error),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = authResult.userId!;
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Route: /api/learning-paths
    if (pathSegments.length === 2) {
      // Return list of available learning paths
      return new Response(
        JSON.stringify({
          available_paths: Object.values(LEARNING_PATHS),
          user_id: userId
        }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
          } 
        }
      );
    }
    
    // Route: /api/learning-paths/{path_id}
    if (pathSegments.length === 3) {
      const pathId = pathSegments[2];
      const includeContent = url.searchParams.get('include_content') === 'true';
      
      if (!LEARNING_PATHS[pathId]) {
        return new Response(
          JSON.stringify({ error: 'Learning path not found', code: 'NOT_FOUND' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      const response = {
        ...LEARNING_PATHS[pathId],
        nodes: includeContent ? SAMPLE_NODES : undefined,
        node_count: includeContent ? Object.keys(SAMPLE_NODES).length : LEARNING_PATHS[pathId].node_count
      };
      
      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600'
          } 
        }
      );
    }
    
    // Route: /api/learning-paths/{path_id}/nodes/{node_id}/context
    if (pathSegments.length === 6 && pathSegments[3] === 'nodes' && pathSegments[5] === 'context') {
      const pathId = pathSegments[2];
      const nodeId = pathSegments[4];
      const radius = parseInt(url.searchParams.get('radius') || '3');
      
      if (!LEARNING_PATHS[pathId]) {
        return new Response(
          JSON.stringify({ error: 'Learning path not found', code: 'NOT_FOUND' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // In production, this would fetch nodes within radius from database
      // For MVP, return sample data
      const contextNodes = {};
      
      // Simple radius implementation - in production use graph traversal
      if (SAMPLE_NODES[nodeId]) {
        contextNodes[nodeId] = SAMPLE_NODES[nodeId];
        
        // Add next nodes within radius
        const visited = new Set([nodeId]);
        const queue = [{ id: nodeId, depth: 0 }];
        
        while (queue.length > 0) {
          const current = queue.shift()!;
          if (current.depth >= radius) continue;
          
          const node = SAMPLE_NODES[current.id];
          if (node && node.next_nodes) {
            for (const nextId of node.next_nodes) {
              if (!visited.has(nextId) && SAMPLE_NODES[nextId]) {
                visited.add(nextId);
                contextNodes[nextId] = SAMPLE_NODES[nextId];
                queue.push({ id: nextId, depth: current.depth + 1 });
              }
            }
          }
        }
      }
      
      return new Response(
        JSON.stringify({
          center_node: nodeId,
          radius: radius,
          nodes: contextNodes,
          cached_at: new Date().toISOString()
        }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=1800' // Cache for 30 minutes
          } 
        }
      );
    }
    
    // Unknown route
    return new Response(
      JSON.stringify({ error: 'Invalid route', code: 'INVALID_ROUTE' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Learning paths API error:', error);
    
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