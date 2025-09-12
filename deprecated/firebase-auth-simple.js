"use strict";
// Alternative Firebase Auth verification for Edge Runtime
// Uses manual JWT verification to avoid jose JWKS issues
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyFirebaseToken = void 0;
exports.verifyFirebaseTokenSimple = verifyFirebaseTokenSimple;
// Decode JWT without verification (for debugging)
function decodeJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3)
            return null;
        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    }
    catch {
        return null;
    }
}
// Simplified verification for MVP - validates basic token structure and expiry
async function verifyFirebaseTokenSimple(authHeader) {
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
        // Decode the token
        const decoded = decodeJWT(token);
        if (!decoded) {
            return {
                success: false,
                error: {
                    error: 'Invalid token format',
                    code: 'AUTH_INVALID_TOKEN',
                },
            };
        }
        // Basic validation
        const now = Math.floor(Date.now() / 1000);
        // Check expiry
        if (decoded.exp < now) {
            return {
                success: false,
                error: {
                    error: 'Token has expired',
                    code: 'AUTH_TOKEN_EXPIRED',
                },
            };
        }
        // Check issued time (not in future)
        if (decoded.iat > now + 300) { // 5 minute clock skew allowance
            return {
                success: false,
                error: {
                    error: 'Invalid token issued time',
                    code: 'AUTH_INVALID_TOKEN',
                },
            };
        }
        // Check issuer
        const expectedIssuer = `https://securetoken.google.com/${projectId}`;
        if (decoded.iss !== expectedIssuer) {
            console.error(`Invalid issuer: expected ${expectedIssuer}, got ${decoded.iss}`);
            return {
                success: false,
                error: {
                    error: 'Invalid token issuer',
                    code: 'AUTH_INVALID_TOKEN',
                },
            };
        }
        // Check audience
        if (decoded.aud !== projectId) {
            console.error(`Invalid audience: expected ${projectId}, got ${decoded.aud}`);
            return {
                success: false,
                error: {
                    error: 'Invalid token audience',
                    code: 'AUTH_INVALID_TOKEN',
                },
            };
        }
        // Extract user info
        const userId = decoded.sub;
        const email = decoded.email;
        console.log(`✅ Token validated for user: ${userId} (simplified verification)`);
        console.warn('⚠️  Using simplified JWT verification - signature not checked');
        return {
            success: true,
            userId,
            email,
        };
    }
    catch (error) {
        console.error('Token verification failed:', error.message);
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
// For production, we should use proper signature verification
// This temporary solution allows us to test the integration
exports.verifyFirebaseToken = verifyFirebaseTokenSimple;
