import '../../lib/polyfills';
import { db, user } from '../../src/lib/db';
import { eq } from 'drizzle-orm';
import { compareSync } from 'bcrypt-ts';
import { SignJWT } from 'jose';
import { LoginRequest } from '@mookti/shared-types';

export const config = {
  runtime: 'edge',
};

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

// Create a secret key for jose
const secret = new TextEncoder().encode(JWT_SECRET);

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as LoginRequest;
    const { email, password } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find user by email
    const users = await db.select().from(user).where(eq(user.email, email)).limit(1);
    
    if (users.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const foundUser = users[0];

    // Verify password
    if (!foundUser.password || !compareSync(password, foundUser.password)) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate JWT token
    const token = await new SignJWT({ 
      id: foundUser.id, 
      email: foundUser.email,
      type: 'regular'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    return new Response(JSON.stringify({ 
      token,
      user: {
        id: foundUser.id,
        email: foundUser.email,
        type: 'regular'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}