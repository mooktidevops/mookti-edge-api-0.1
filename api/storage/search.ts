import '../../lib/polyfills';
import storageService from '../../lib/storage/storage-service';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  const method = request.method;
  
  // Handle CORS
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  if (method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const body: any = await request.json() as { userId?: string; [key: string]: any };
    const { userId, query, limit } = body;
    
    if (!userId || !query) {
      return new Response(JSON.stringify({ error: 'userId and query required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const results = await storageService.searchConversations(
      userId,
      query,
      limit || 10
    );
    
    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Storage API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}