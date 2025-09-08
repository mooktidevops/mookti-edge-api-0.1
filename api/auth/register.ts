import '../../lib/polyfills';
import { db, user } from '../../src/lib/db';
import { eq } from 'drizzle-orm';
import { hashSync } from 'bcrypt-ts';
import { RegisterRequest } from '@mookti/shared-types';
import { SignJWT } from 'jose';

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
    const body = await request.json() as RegisterRequest;
    const { email, password } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user already exists
    const existingUsers = await db.select().from(user).where(eq(user.email, email)).limit(1);
    
    if (existingUsers.length > 0) {
      return new Response(JSON.stringify({ error: 'User already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Hash password
    const hashedPassword = hashSync(password, 10);

    // Create new user
    const newUser = await db.insert(user).values({
      id: crypto.randomUUID(),
      email,
      password: hashedPassword,
    }).returning();

    const createdUser = newUser[0];

    // Generate JWT token
    const token = await new SignJWT({ 
      id: createdUser.id, 
      email: createdUser.email,
      type: 'regular'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    return new Response(JSON.stringify({ 
      token,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        type: 'regular'
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}