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
      const userId = url.searchParams.get('userId');
      const email = url.searchParams.get('email');
      
      if (email) {
        const user = await storageService.getUserByEmail(email);
        if (!user) {
          return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify(user), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (userId) {
        const user = await storageService.getUser(userId);
        if (!user) {
          return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify(user), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ error: 'userId or email required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (method === 'POST') {
      const body: any = await request.json();
      
      // Check if user already exists
      if (body.email) {
        const existingUser = await storageService.getUserByEmail(body.email);
        if (existingUser) {
          // Return existing user instead of error for idempotency
          return new Response(JSON.stringify(existingUser), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Create new user
      const user = await storageService.createUser({
        email: body.email,
        name: body.name || '',
        type: body.type || 'free',
        preferences: body.preferences || {},
        selectedModel: body.selectedModel,
        selectedProvider: body.selectedProvider,
      });
      
      // Create session if requested
      if (body.createSession) {
        const sessionToken = crypto.randomUUID();
        await storageService.createSession(user.id, sessionToken);
        
        return new Response(JSON.stringify({
          user,
          session: { token: sessionToken }
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify(user), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (method === 'PUT') {
      const body: any = await request.json();
      const { userId, ...updates } = body;
      
      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const updatedUser = await storageService.updateUser(userId, updates);
      if (!updatedUser) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify(updatedUser), {
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