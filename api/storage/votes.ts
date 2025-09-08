import '../../lib/polyfills';
import databaseStorage from '../../src/lib/db/storage-service';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  
  // Handle CORS
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  try {
    if (method === 'GET') {
      const chatId = url.searchParams.get('chatId');
      
      if (!chatId) {
        return new Response(JSON.stringify({ error: 'chatId required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const votes = await databaseStorage.getVotesByChatId(chatId);
      
      return new Response(JSON.stringify(votes), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (method === 'POST') {
      const body: any = await request.json() as { message?: string; context?: any };
      const { chatId, messageId, isUpvoted } = body;
      
      if (!chatId || !messageId || isUpvoted === undefined) {
        return new Response(JSON.stringify({ error: 'chatId, messageId, and isUpvoted are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const vote = await databaseStorage.createOrUpdateVote(
        chatId,
        messageId,
        isUpvoted
      );
      
      return new Response(JSON.stringify(vote), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
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