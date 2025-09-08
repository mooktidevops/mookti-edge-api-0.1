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
        const user = await databaseStorage.getUserByEmail(email);
        if (!user) {
          return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({
          id: user.id,
          email: user.email
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (userId) {
        const user = await databaseStorage.getUserById(userId);
        if (!user) {
          return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({
          id: user.id,
          email: user.email
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ error: 'userId or email required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (method === 'POST') {
      const body: any = await request.json() as { userId?: string; [key: string]: any };
      
      // Check if user already exists
      if (body.email) {
        const existingUser = await databaseStorage.getUserByEmail(body.email);
        if (existingUser) {
          // Return existing user instead of error for idempotency
          return new Response(JSON.stringify({
            id: existingUser.id,
            email: existingUser.email
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Create new user (with optional ID in dev mode)
      const user = await databaseStorage.createUser(
        body.email, 
        body.password,
        body.id // Will only be used in development mode
      );
      
      return new Response(JSON.stringify({
        id: user.id,
        email: user.email
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // PUT method removed for now - can be added later if needed
    
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