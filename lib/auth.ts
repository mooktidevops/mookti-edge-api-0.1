// Edge-compatible Firebase Auth verification using jose
import { importX509, jwtVerify } from 'jose';
import type { ErrorResponse } from './types';

// Firebase public keys endpoint
const FIREBASE_KEYS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// Cache for Firebase public keys
let keysCache: { keys: any; expiry: number } | null = null;

async function getFirebasePublicKeys() {
  // Check cache
  if (keysCache && keysCache.expiry > Date.now()) {
    return keysCache.keys;
  }

  // Fetch new keys
  const response = await fetch(FIREBASE_KEYS_URL);
  const keys = await response.json();
  
  // Cache for 1 hour
  keysCache = {
    keys,
    expiry: Date.now() + 3600000
  };
  
  return keys;
}

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
    const header = JSON.parse(atob(headerB64));
    const kid = header.kid;

    if (!kid) {
      throw new Error('No kid in token header');
    }

    // Get Firebase public keys
    const keys = await getFirebasePublicKeys();
    const publicKeyPem = keys[kid];

    if (!publicKeyPem) {
      throw new Error('Public key not found for kid: ' + kid);
    }

    // Import the public key
    const publicKey = await importX509(publicKeyPem, 'RS256');

    // Verify the token
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
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
    
    let errorCode = 'AUTH_INVALID_TOKEN';
    let errorMessage = 'Invalid authentication token';
    
    if (error.code === 'ERR_JWT_EXPIRED') {
      errorCode = 'AUTH_TOKEN_EXPIRED';
      errorMessage = 'Authentication token has expired';
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