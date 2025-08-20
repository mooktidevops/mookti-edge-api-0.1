// Firebase Auth verification for Edge Runtime using jose
// Implements proper JWT signature verification

import { importX509, jwtVerify } from 'jose';
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

interface GooglePublicKeys {
  [key: string]: string;
}

// Cache for Google's public keys
let keysCache: { keys: GooglePublicKeys; expires: number } | null = null;

// Fetch Google's public keys for Firebase token verification
async function getGooglePublicKeys(): Promise<GooglePublicKeys> {
  const now = Date.now();
  
  // Return cached keys if still valid
  if (keysCache && keysCache.expires > now) {
    return keysCache.keys;
  }

  try {
    const response = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch public keys: ${response.status}`);
    }

    const keys = await response.json() as GooglePublicKeys;
    
    // Cache for 1 hour (Google rotates keys periodically)
    keysCache = {
      keys,
      expires: now + 3600000, // 1 hour
    };

    return keys;
  } catch (error) {
    console.error('Failed to fetch Google public keys:', error);
    throw error;
  }
}

// Verify Firebase ID token with proper signature verification
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
    // Decode token header to get key ID
    const [headerB64] = token.split('.');
    const header = JSON.parse(
      atob(headerB64.replace(/-/g, '+').replace(/_/g, '/'))
    );
    
    if (!header.kid) {
      return {
        success: false,
        error: {
          error: 'Invalid token: missing key ID',
          code: 'AUTH_INVALID_TOKEN',
        },
      };
    }

    // Get Google's public keys
    const publicKeys = await getGooglePublicKeys();
    const publicKey = publicKeys[header.kid];

    if (!publicKey) {
      return {
        success: false,
        error: {
          error: 'Invalid token: unknown key ID',
          code: 'AUTH_INVALID_TOKEN',
        },
      };
    }

    // Import the X.509 certificate and verify the token
    try {
      const key = await importX509(publicKey, header.alg || 'RS256');
      
      // Verify the token with jose
      const { payload } = await jwtVerify(token, key, {
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
    } catch (innerError: any) {
      // Handle jose verification errors
      throw innerError; // Re-throw to be caught by outer catch
    }
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