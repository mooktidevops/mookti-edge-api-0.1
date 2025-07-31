// Firebase Auth verification for Vercel Edge Runtime
// Uses a simpler approach that works with Edge Runtime limitations

import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { ErrorResponse } from './types';

interface DecodedToken {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  email?: string;
  email_verified?: boolean;
  auth_time?: number;
  firebase?: {
    identities: Record<string, any>;
    sign_in_provider: string;
  };
}

// Use Google's JWKS endpoint instead of X.509 certificates
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

// Verify Firebase ID token using JWKS (works better in Edge Runtime)
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
    // Verify the token using JWKS
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    const decodedToken = payload as unknown as DecodedToken;

    // Additional Firebase-specific validations
    const now = Math.floor(Date.now() / 1000);
    
    // Check auth_time is not in the future (with 5 min clock skew)
    if (decodedToken.auth_time && decodedToken.auth_time > now + 300) {
      return {
        success: false,
        error: {
          error: 'Invalid token: auth_time in future',
          code: 'AUTH_INVALID_TOKEN',
        },
      };
    }

    // Extract user info
    const userId = decodedToken.sub;
    const email = decodedToken.email;

    console.log(`✅ Firebase token verified for user: ${userId}`);

    return {
      success: true,
      userId,
      email,
    };
  } catch (error: any) {
    console.error('Token verification failed:', error.message);
    
    // Handle specific jose errors
    if (error.code === 'ERR_JWT_EXPIRED') {
      return {
        success: false,
        error: {
          error: 'Token has expired',
          code: 'AUTH_TOKEN_EXPIRED',
        },
      };
    }
    
    if (error.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
      return {
        success: false,
        error: {
          error: 'Token validation failed',
          code: 'AUTH_INVALID_TOKEN',
          details: error.message,
        },
      };
    }

    return {
      success: false,
      error: {
        error: 'Token verification failed',
        code: 'AUTH_INVALID_TOKEN',
        details: error.message,
      },
    };
  }
}

// Backward compatibility export
export { verifyFirebaseToken as verifyFirebaseTokenSimple };