import { jwtVerify } from 'jose';
import { isDevMode, getDevUser, logDev, logError } from '../config/dev-mode';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const secret = new TextEncoder().encode(JWT_SECRET);

export interface AuthUser {
  id: string;
  email: string;
  type: 'guest' | 'regular';
}

export async function verifyApiAuth(request: Request): Promise<AuthUser | null> {
  try {
    // Development bypass - check centralized dev mode config
    if (isDevMode(request)) {
      const devUser = getDevUser(request);
      logDev('Auth bypass activated', { user: devUser });
      return devUser;
    }

    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const { payload } = await jwtVerify(token, secret);

    // Return user data from token
    return {
      id: payload.id as string,
      email: payload.email as string,
      type: payload.type as 'guest' | 'regular',
    };
  } catch (error) {
    console.error('Auth verification failed:', error);
    return null;
  }
}

export function requireAuth(user: AuthUser | null): Response | null {
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}

export function requireOwnership(user: AuthUser | null, resourceOwnerId: string, request?: Request): Response | null {
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Skip ownership check in dev mode
  if (isDevMode(request)) {
    logDev('Skipping ownership check in dev mode', { userId: user.id, resourceOwnerId });
    return null;
  }

  if (user.id !== resourceOwnerId) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return null;
}