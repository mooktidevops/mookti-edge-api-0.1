"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyFirebaseToken = verifyFirebaseToken;
exports.checkRateLimit = checkRateLimit;
// Manual JWKS implementation for Edge Runtime compatibility
const jose_1 = require("jose");
// Cache for Google's public keys
let keysCache = null;
let keysCacheExpiry = 0;
// Fetch Google's public keys manually
async function getGooglePublicKeys() {
    const now = Date.now();
    // Use cached keys if still valid (cache for 1 hour)
    if (keysCache && now < keysCacheExpiry) {
        return keysCache;
    }
    try {
        const response = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
        if (!response.ok) {
            throw new Error(`Failed to fetch JWKS: ${response.status}`);
        }
        const jwks = await response.json();
        // Cache for 1 hour
        keysCache = jwks;
        keysCacheExpiry = now + 3600000;
        return jwks;
    }
    catch (error) {
        console.error('Failed to fetch Google public keys:', error);
        throw error;
    }
}
// Get the key for a specific kid
async function getKeyForKid(kid) {
    const jwks = await getGooglePublicKeys();
    const key = jwks.keys.find((k) => k.kid === kid);
    if (!key) {
        throw new Error(`Key with kid "${kid}" not found in JWKS`);
    }
    return key;
}
// Decode JWT header to get kid
function getKidFromToken(token) {
    const [headerB64] = token.split('.');
    const header = JSON.parse(atob(headerB64));
    return header.kid;
}
async function verifyFirebaseToken(authHeader) {
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
        // Get the kid from the token header
        const kid = getKidFromToken(token);
        // Get the corresponding key from Google's JWKS
        const jwk = await getKeyForKid(kid);
        // Import the JWK as a CryptoKey
        const publicKey = await (0, jose_1.importJWK)(jwk, 'RS256');
        // Verify the token with the imported key
        const { payload } = await (0, jose_1.jwtVerify)(token, publicKey, {
            issuer: `https://securetoken.google.com/${projectId}`,
            audience: projectId,
            algorithms: ['RS256'],
        });
        // Extract user info
        const userId = payload.sub;
        const email = payload.email;
        console.log(`✅ Verified Firebase token for user: ${userId}`);
        return {
            success: true,
            userId,
            email,
        };
    }
    catch (error) {
        console.error('Token verification failed:', error.message);
        let errorCode = 'AUTH_INVALID_TOKEN';
        let errorMessage = 'Invalid authentication token';
        if (error.code === 'ERR_JWT_EXPIRED') {
            errorCode = 'AUTH_TOKEN_EXPIRED';
            errorMessage = 'Authentication token has expired';
        }
        else if (error.message?.includes('kid')) {
            errorMessage = 'Token signing key not found';
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
async function checkRateLimit(userId, limit = 100) {
    // For MVP, allow all requests
    // TODO: Implement proper rate limiting with Vercel KV or Upstash
    return true;
}
