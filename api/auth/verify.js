"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handler;
require("../../lib/polyfills");
const jose_1 = require("jose");
exports.config = {
    runtime: 'edge',
};
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
// Create a secret key for jose
const secret = new TextEncoder().encode(JWT_SECRET);
async function handler(request) {
    if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    try {
        // Get token from Authorization header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'No token provided' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        // Verify token
        const { payload } = await (0, jose_1.jwtVerify)(token, secret);
        return new Response(JSON.stringify({
            valid: true,
            user: {
                id: payload.id,
                email: payload.email,
                type: payload.type
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    catch (error) {
        console.error('Token verification error:', error);
        // Jose throws different error types
        if (error.code === 'ERR_JWT_EXPIRED' || error.code === 'ERR_JWT_INVALID' ||
            error.code === 'ERR_JWS_INVALID' || error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' ||
            error.message?.includes('JWT') || error.message?.includes('JWS')) {
            return new Response(JSON.stringify({
                valid: false,
                error: 'Invalid or expired token'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
