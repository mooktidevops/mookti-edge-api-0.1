"use strict";
// Firebase Auth verification for Vercel Edge Runtime
// Uses a simpler approach that works with Edge Runtime limitations
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyFirebaseToken = verifyFirebaseToken;
exports.verifyFirebaseTokenSimple = verifyFirebaseToken;
const jose_1 = require("jose");
// Google's JWKS endpoint URL for Firebase tokens
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
// Verify Firebase ID token using JWKS (works better in Edge Runtime)
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
        // Create JWKS set at runtime to avoid Edge Runtime initialization issues
        // Note: createRemoteJWKSet returns a function that fetches keys
        const JWKS = (0, jose_1.createRemoteJWKSet)(new URL(GOOGLE_JWKS_URL));
        // Verify the token using JWKS
        const { payload } = await (0, jose_1.jwtVerify)(token, JWKS, {
            issuer: `https://securetoken.google.com/${projectId}`,
            audience: projectId,
            algorithms: ['RS256'], // Explicitly specify the algorithm
        });
        const decodedToken = payload;
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
    }
    catch (error) {
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
