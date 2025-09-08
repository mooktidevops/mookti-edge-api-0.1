import '../../lib/polyfills';
import { jwtVerify } from 'jose';

export const config = {
  runtime: 'edge',
};

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

// Create a secret key for jose
const secret = new TextEncoder().encode(JWT_SECRET);

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No token provided' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const { payload } = await jwtVerify(token, secret);

    return new Response(JSON.stringify({ 
      valid: true,
      user: {
        id: payload.id as string,
        email: payload.email as string,
        type: payload.type as string
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Token verification error:', error);
    
    // Jose throws different error types
    if (error.code === 'ERR_JWT_EXPIRED' || error.code === 'ERR_JWT_INVALID' || 
        error.code === 'ERR_JWS_INVALID' || error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' ||
        error.message?.includes('JWT') || error.message?.includes('JWS')) {
      return new Response(JSON.stringify({ 
        valid: false,
        error: 'Invalid or expired token' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}