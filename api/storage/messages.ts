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
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  try {
    if (method === 'GET') {
      const chatId = url.searchParams.get('chatId');
      const messageId = url.searchParams.get('messageId');
      const limit = url.searchParams.get('limit');
      
      if (!chatId) {
        return new Response(JSON.stringify({ error: 'chatId required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (messageId) {
        // Get specific message
        const message = await storageService.getMessage(chatId, messageId);
        if (!message) {
          return new Response(JSON.stringify({ error: 'Message not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify(message), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Get all messages for chat
      const messages = await storageService.getMessages(
        chatId,
        limit ? parseInt(limit) : undefined
      );
      
      return new Response(JSON.stringify(messages), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (method === 'POST') {
      const body: any = await request.json();
      const { chatId, role, content, parts, model, provider } = body;
      
      if (!chatId || !role) {
        return new Response(JSON.stringify({ error: 'chatId and role required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const message = await storageService.addMessage(chatId, {
        role,
        content: content || '',
        parts,
        model,
        provider,
      });
      
      // Update chat's last message time
      await storageService.updateChat(chatId, {
        lastMessageAt: new Date(),
      });
      
      // If there's content and it's from the user, create embedding
      if (content && role === 'user') {
        try {
          await storageService.generateAndStoreEmbedding(message);
        } catch (embedError) {
          console.warn('Failed to create embedding:', embedError);
          // Don't fail the request if embedding fails
        }
      }
      
      return new Response(JSON.stringify(message), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (method === 'DELETE') {
      const chatId = url.searchParams.get('chatId');
      const afterTimestamp = url.searchParams.get('afterTimestamp');
      
      if (!chatId || !afterTimestamp) {
        return new Response(JSON.stringify({ error: 'chatId and afterTimestamp required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const deleted = await storageService.deleteMessagesByChatIdAfterTimestamp(
        chatId,
        new Date(afterTimestamp)
      )
      
      return new Response(JSON.stringify({ deleted }), {
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