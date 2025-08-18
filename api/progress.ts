// Progress Tracking and Sync API
// Manages user progress through learning paths with conflict resolution

import { verifyFirebaseToken } from '../lib/auth-native';

export const config = {
  runtime: 'edge',
  regions: ['iad1'],
};

// In production, this would use a database (Firestore, PostgreSQL, etc.)
// For MVP, we'll use in-memory storage (will reset on deployment)
const progressStore = new Map<string, UserProgress>();

interface UserProgress {
  user_id: string;
  path_id: string;
  current_node: string;
  completed_nodes: string[];
  last_sync: string;
  total_time_spent: number;
  completion_percentage: number;
  session_id: string;
  version: number; // For conflict resolution
}

interface SyncRequest {
  path_id: string;
  current_node: string;
  completed_nodes: string[];
  timestamp: string;
  session_id: string;
  total_time_spent?: number;
}

interface ConflictResolution {
  strategy: 'last_write_wins' | 'merge' | 'server_priority';
  resolved_progress: UserProgress;
  conflicts_detected: string[];
}

function calculateCompletionPercentage(completedNodes: string[], totalNodes: number): number {
  return Math.round((completedNodes.length / totalNodes) * 100);
}

function resolveConflicts(
  local: SyncRequest,
  remote: UserProgress | undefined
): ConflictResolution {
  const conflicts: string[] = [];
  
  if (!remote) {
    // No remote progress, use local as-is
    return {
      strategy: 'last_write_wins',
      resolved_progress: {
        user_id: '', // Will be filled by caller
        path_id: local.path_id,
        current_node: local.current_node,
        completed_nodes: local.completed_nodes,
        last_sync: local.timestamp,
        total_time_spent: local.total_time_spent || 0,
        completion_percentage: calculateCompletionPercentage(local.completed_nodes, 200), // Hardcoded for MVP
        session_id: local.session_id,
        version: 1
      },
      conflicts_detected: []
    };
  }
  
  // Check for conflicts
  const localTime = new Date(local.timestamp).getTime();
  const remoteTime = new Date(remote.last_sync).getTime();
  
  if (local.current_node !== remote.current_node) {
    conflicts.push('current_node');
  }
  
  // Merge completed nodes (union)
  const completedNodesSet = new Set([
    ...local.completed_nodes,
    ...remote.completed_nodes
  ]);
  
  // Resolve current node conflict
  let resolvedCurrentNode = local.current_node;
  if (conflicts.includes('current_node')) {
    // Use the node that appears later in the completed list
    const localIndex = local.completed_nodes.indexOf(local.current_node);
    const remoteIndex = remote.completed_nodes.indexOf(remote.current_node);
    
    if (remoteIndex > localIndex) {
      resolvedCurrentNode = remote.current_node;
    }
  }
  
  // Merge time spent
  const resolvedTimeSpent = Math.max(
    local.total_time_spent || 0,
    remote.total_time_spent
  );
  
  return {
    strategy: conflicts.length > 0 ? 'merge' : 'last_write_wins',
    resolved_progress: {
      user_id: remote.user_id,
      path_id: local.path_id,
      current_node: resolvedCurrentNode,
      completed_nodes: Array.from(completedNodesSet),
      last_sync: local.timestamp,
      total_time_spent: resolvedTimeSpent,
      completion_percentage: calculateCompletionPercentage(
        Array.from(completedNodesSet),
        200
      ),
      session_id: local.session_id,
      version: remote.version + 1
    },
    conflicts_detected: conflicts
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
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
    
    // POST /api/progress/sync
    if (req.method === 'POST' && pathSegments[2] === 'sync') {
      const body: SyncRequest = await req.json();
      
      if (!body.path_id || !body.current_node || !body.completed_nodes) {
        return new Response(
          JSON.stringify({
            error: 'Missing required fields',
            code: 'INVALID_REQUEST',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      const progressKey = `${userId}:${body.path_id}`;
      const existingProgress = progressStore.get(progressKey);
      
      // Resolve any conflicts
      const resolution = resolveConflicts(body, existingProgress);
      resolution.resolved_progress.user_id = userId;
      
      // Store the resolved progress
      progressStore.set(progressKey, resolution.resolved_progress);
      
      return new Response(
        JSON.stringify({
          success: true,
          progress: resolution.resolved_progress,
          conflicts: resolution.conflicts_detected,
          resolution_strategy: resolution.strategy
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // GET /api/progress/{user_id}/{path_id}
    if (req.method === 'GET' && pathSegments.length === 4) {
      const requestedUserId = pathSegments[2];
      const pathId = pathSegments[3];
      
      // Users can only access their own progress
      if (requestedUserId !== userId) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      const progressKey = `${userId}:${pathId}`;
      const progress = progressStore.get(progressKey);
      
      if (!progress) {
        return new Response(
          JSON.stringify({
            user_id: userId,
            path_id: pathId,
            current_node: '1',
            completed_nodes: [],
            last_sync: null,
            total_time_spent: 0,
            completion_percentage: 0,
            session_id: null,
            version: 0
          }),
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify(progress),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'private, max-age=60' // Cache for 1 minute
          } 
        }
      );
    }
    
    // GET /api/progress/{user_id}
    if (req.method === 'GET' && pathSegments.length === 3) {
      const requestedUserId = pathSegments[2];
      
      // Users can only access their own progress
      if (requestedUserId !== userId) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Get all progress for this user
      const userProgress: UserProgress[] = [];
      for (const [key, progress] of progressStore.entries()) {
        if (key.startsWith(`${userId}:`)) {
          userProgress.push(progress);
        }
      }
      
      return new Response(
        JSON.stringify({
          user_id: userId,
          learning_paths: userProgress
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Invalid route', code: 'INVALID_ROUTE' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Progress API error:', error);
    
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