import '../../lib/polyfills';
import { db, user } from '../../src/lib/db';
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
    // Generate guest user
    const guestId = crypto.randomUUID();
    const guestEmail = `guest-${Date.now()}@mookti.ai`;

    // Create guest user in database
    const newUser = await db.insert(user).values({
      id: guestId,
      email: guestEmail,
      password: null, // Guest users have no password
    }).returning();

    const createdUser = newUser[0];

    // Generate JWT token
    const token = await new SignJWT({ 
      id: createdUser.id, 
      email: createdUser.email,
      type: 'guest'
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
        type: 'guest'
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Guest creation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}