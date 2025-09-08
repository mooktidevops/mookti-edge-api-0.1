import '../../../lib/polyfills';
import databaseStorage from '../../../src/lib/db/storage-service';
import { verifyApiAuth as verifyAuth, requireOwnership } from '../../../lib/auth/middleware';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  
  // Extract chat ID from the URL path
  const pathParts = url.pathname.split('/').filter(p => p);
  const chatId = pathParts[pathParts.length - 1];
  
  // Handle CORS
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  // Verify authentication
  const user = await verifyAuth(request);
  
  try {
    if (method === 'GET') {
      // Get specific chat
      const chat = await databaseStorage.getChatById(chatId);
      if (!chat) {
        return new Response(JSON.stringify({ error: 'Chat not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Verify user owns the chat
      const ownershipError = requireOwnership(user, chat.userId);
      if (ownershipError) return ownershipError;
      
      return new Response(JSON.stringify(chat), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (method === 'DELETE') {
      // Require auth to delete
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Verify chat exists and user owns it
      const chat = await databaseStorage.getChatById(chatId);
      if (!chat) {
        return new Response(JSON.stringify({ error: 'Chat not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const ownershipError = requireOwnership(user, chat.userId);
      if (ownershipError) return ownershipError;
      
      await databaseStorage.deleteChat(chatId);
      
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