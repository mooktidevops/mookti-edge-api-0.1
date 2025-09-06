import '../../lib/polyfills';
import storageService from '../../lib/storage/storage-service';

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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  try {
    if (method === 'GET') {
      const chatId = url.searchParams.get('chatId');
      const userId = url.searchParams.get('userId');
      
      if (chatId) {
        // Get specific chat
        const chat = await storageService.getChat(chatId);
        if (!chat) {
          return new Response(JSON.stringify({ error: 'Chat not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Verify user owns the chat
        if (userId && chat.userId !== userId) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify(chat), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (userId) {
        // Get all chats for user
        const chats = await storageService.getUserChats(userId);
        return new Response(JSON.stringify(chats), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ error: 'userId or chatId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (method === 'POST') {
      const body: any = await request.json();
      const { userId, title, visibility } = body;
      
      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const chat = await storageService.createChat(userId, title || 'New Chat');
      
      // Update visibility if provided
      if (visibility) {
        await storageService.updateChat(chat.id, { visibility });
      }
      
      return new Response(JSON.stringify(chat), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (method === 'PUT') {
      const body: any = await request.json();
      const { chatId, ...updates } = body;
      
      if (!chatId) {
        return new Response(JSON.stringify({ error: 'chatId required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const updatedChat = await storageService.updateChat(chatId, updates);
      if (!updatedChat) {
        return new Response(JSON.stringify({ error: 'Chat not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify(updatedChat), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (method === 'DELETE') {
      const chatId = url.searchParams.get('chatId');
      
      if (!chatId) {
        return new Response(JSON.stringify({ error: 'chatId required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const deleted = await storageService.deleteChat(chatId);
      if (!deleted) {
        return new Response(JSON.stringify({ error: 'Chat not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ success: true }), {
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