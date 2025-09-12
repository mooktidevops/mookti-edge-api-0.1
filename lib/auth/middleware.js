"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyApiAuth = verifyApiAuth;
exports.requireAuth = requireAuth;
exports.requireOwnership = requireOwnership;
const jose_1 = require("jose");
const dev_mode_1 = require("../config/dev-mode");
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const secret = new TextEncoder().encode(JWT_SECRET);
async function verifyApiAuth(request) {
    try {
        // Development bypass - check centralized dev mode config
        if ((0, dev_mode_1.isDevMode)(request)) {
            const devUser = (0, dev_mode_1.getDevUser)(request);
            (0, dev_mode_1.logDev)('Auth bypass activated', { user: devUser });
            return devUser;
        }
        // Get token from Authorization header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        // Verify token
        const { payload } = await (0, jose_1.jwtVerify)(token, secret);
        // Return user data from token
        return {
            id: payload.id,
            email: payload.email,
            type: payload.type,
        };
    }
    catch (error) {
        console.error('Auth verification failed:', error);
        return null;
    }
}
function requireAuth(user) {
    if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return null;
}
function requireOwnership(user, resourceOwnerId, request) {
    if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    // Skip ownership check in dev mode
    if ((0, dev_mode_1.isDevMode)(request)) {
        (0, dev_mode_1.logDev)('Skipping ownership check in dev mode', { userId: user.id, resourceOwnerId });
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
