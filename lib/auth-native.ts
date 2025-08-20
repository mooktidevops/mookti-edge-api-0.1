// Native Web Crypto API implementation for Firebase JWT verification
import type { ErrorResponse } from './types';

// Cache for Google's public keys
let keysCache: any = null;
let keysCacheExpiry = 0;

// Base64url decode helper
function base64urlDecode(str: string): Uint8Array {
  // Add padding if needed
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// Fetch Google's public keys
async function getGooglePublicKeys() {
  const now = Date.now();
  
  // Use cached keys if still valid (cache for 1 hour)
  if (keysCache && now < keysCacheExpiry) {
    return keysCache;
  }

  try {
    const response = await fetch(
      'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS: ${response.status}`);
    }
    
    const jwks = await response.json();
    
    // Cache for 1 hour
    keysCache = jwks;
    keysCacheExpiry = now + 3600000;
    
    return jwks;
  } catch (error) {
    console.error('Failed to fetch Google public keys:', error);
    throw error;
  }
}

// Convert JWK to CryptoKey
async function jwkToCryptoKey(jwk: any): Promise<any> {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify']
  );
}

// Parse JWT and extract parts
function parseJWT(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  
  const [headerB64, payloadB64, signatureB64] = parts;
  
  // Decode header and payload
  const header = JSON.parse(new TextDecoder().decode(base64urlDecode(headerB64)));
  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64)));
  
  return {
    header,
    payload,
    signatureB64,
    signedData: `${headerB64}.${payloadB64}`,
  };
}

// Verify JWT signature using Web Crypto API
async function verifyJWTSignature(
  token: string,
  publicKey: any
): Promise<boolean> {
  const { signatureB64, signedData } = parseJWT(token);
  
  const signature = base64urlDecode(signatureB64);
  const data = new TextEncoder().encode(signedData);
  
  return await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    signature,
    data
  );
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
    // Parse the JWT
    const { header, payload } = parseJWT(token);
    
    // Get the kid from the header
    const kid = header.kid;
    if (!kid) {
      throw new Error('No kid in token header');
    }
    
    // Get Google's public keys
    const jwks = await getGooglePublicKeys();
    const jwk = jwks.keys.find((k: any) => k.kid === kid);
    
    if (!jwk) {
      throw new Error(`Key with kid "${kid}" not found`);
    }
    
    // Convert JWK to CryptoKey
    const publicKey = await jwkToCryptoKey(jwk);
    
    // Verify the signature
    const isValid = await verifyJWTSignature(token, publicKey);
    
    if (!isValid) {
      throw new Error('Invalid signature');
    }
    
    // Verify claims
    const now = Math.floor(Date.now() / 1000);
    
    // Check expiration
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }
    
    // Check not before
    if (payload.nbf && payload.nbf > now) {
      throw new Error('Token not yet valid');
    }
    
    // Check issuer
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
      throw new Error('Invalid issuer');
    }
    
    // Check audience
    if (payload.aud !== projectId) {
      throw new Error('Invalid audience');
    }
    
    // Extract user info
    const userId = payload.sub;
    const email = payload.email;
    
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
    
    if (error.message === 'Token expired') {
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
  return true;
}