// Edge-compatible Firebase Auth verification using jose
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { ErrorResponse } from './types';

// Firebase JWKS endpoint (compatible with jose)
const getFirebaseJWKS = (projectId: string) => {
  const jwksUri = `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`;
  return createRemoteJWKSet(new URL(jwksUri));
};

export async function verifyFirebaseToken(authHeader: string | null): Promise<{
  success: boolean;
  userId?: string;
  email?: string;
  error?: ErrorResponse;
}> {
  // Check for auth header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: {
        error: 'Missing or invalid authorization header',
        code: 'AUTH_HEADER_MISSING',
      },
    };
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const projectId = process.env.firebase_project_id;

  if (!projectId) {
    console.error('Firebase project ID not configured');
    return {
      success: false,
      error: {
        error: 'Server configuration error',
        code: 'SERVER_ERROR',
      },
    };
  }

  try {
    // Get JWKS for Firebase
    const JWKS = getFirebaseJWKS(projectId);

    // Verify the token using JWKS
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
    });

    // Extract user info
    const userId = payload.sub as string;
    const email = payload.email as string | undefined;

    console.log(`✅ Verified Firebase token for user: ${userId}`);

    return {
      success: true,
      userId,
      email,
    };
  } catch (error: any) {
    console.error('Token verification failed:', error.message);
    console.error('Error type:', error.constructor.name);
    console.error('Error stack:', error.stack);
    
    let errorCode = 'AUTH_INVALID_TOKEN';
    let errorMessage = 'Invalid authentication token';
    
    if (error.code === 'ERR_JWT_EXPIRED') {
      errorCode = 'AUTH_TOKEN_EXPIRED';
      errorMessage = 'Authentication token has expired';
    } else if (error.message?.includes('RS256')) {
      // This is the specific error we're seeing
      console.error('Jose library error - attempting workaround');
      errorMessage = 'JWT verification library error';
    }
    
    return {
      success: false,
      error: {
        error: errorMessage,
        code: errorCode,
        details: error.message,
      },
    };
  }
}

// Simple rate limiting (placeholder)
export async function checkRateLimit(userId: string, limit: number = 100): Promise<boolean> {
  // For MVP, allow all requests
  // TODO: Implement proper rate limiting with Vercel KV or Upstash
  return true;
}