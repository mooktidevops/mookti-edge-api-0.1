import '../../lib/polyfills';
import databaseStorage from '../../src/lib/db/storage-service';
import { verifyApiAuth as verifyAuth, requireAuth, requireOwnership } from '../../lib/auth/middleware';
import { isDevMode, getDevModeConfig, logDev, logError } from '../../lib/config/dev-mode';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  
  // Parse path to handle /api/storage/chats/{id} pattern
  const pathParts = url.pathname.split('/').filter(p => p);
  const chatIdFromPath = pathParts.length > 3 ? pathParts[3] : null;
  
  logDev('Chat API Request', { 
    method, 
    pathname: url.pathname, 
    pathParts, 
    chatIdFromPath,
    searchParams: Object.fromEntries(url.searchParams)
  });
  
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
  
  // Verify authentication for all requests
  const user = await verifyAuth(request);
  
  try {
    if (method === 'GET') {
      const chatId = chatIdFromPath || url.searchParams.get('chatId');
      const userId = url.searchParams.get('userId');
      
      if (chatId) {
        // Get specific chat
        logDev('Getting chat by ID', { chatId, userId: user?.id });
        const chat = await databaseStorage.getChatById(chatId);
        if (!chat) {
          logError('Chat not found', { chatId, userId: user?.id });
          return new Response(JSON.stringify({ error: 'Chat not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Check ownership with dev mode support
        const ownershipError = requireOwnership(user, chat.userId, request);
        if (ownershipError) return ownershipError;
        
        return new Response(JSON.stringify(chat), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (userId) {
        // Require auth to get chats
        const authError = requireAuth(user);
        if (authError) return authError;
        
        // Only allow users to get their own chats
        if (user.id !== userId) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Get all chats for user
        const chats = await databaseStorage.getChatsByUserId(userId);
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
      // Require auth to create chats
      const authError = requireAuth(user);
      if (authError) return authError;
      
      const body: any = await request.json() as { userId?: string; [key: string]: any };
      const { userId: bodyUserId, title, visibility, id } = body;
      
      // In dev mode, allow using the userId from the body if provided
      const devMode = isDevMode(request);
      const userId = (devMode && bodyUserId) ? bodyUserId : user.id;
      
      logDev('Creating chat', { 
        bodyUserId, 
        actualUserId: userId, 
        devMode,
        title 
      });
      
      const chat = await databaseStorage.createChat(
        userId, 
        title || 'New Chat',
        visibility || 'private',
        id // Pass optional ID to storage service
      );
      
      return new Response(JSON.stringify(chat), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // PUT method removed for now - can be added later when update functionality is needed
    
    if (method === 'DELETE') {
      // Require auth to delete chats
      const authError = requireAuth(user);
      if (authError) return authError;
      
      const chatId = url.searchParams.get('chatId');
      
      if (!chatId) {
        return new Response(JSON.stringify({ error: 'chatId required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Verify user owns the chat before deleting
      const chat = await databaseStorage.getChatById(chatId);
      if (!chat) {
        return new Response(JSON.stringify({ error: 'Chat not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const ownershipError = requireOwnership(user, chat.userId);
      if (ownershipError) return ownershipError;
      
      const deleted = await databaseStorage.deleteChat(chatId);
      
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