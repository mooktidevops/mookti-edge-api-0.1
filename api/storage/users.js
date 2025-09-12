"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handler;
require("../../lib/polyfills");
const storage_service_1 = __importDefault(require("../../src/lib/db/storage-service"));
exports.config = {
    runtime: 'edge',
};
async function handler(request) {
    const url = new URL(request.url);
    const method = request.method;
    // Handle CORS
    if (method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }
    try {
        if (method === 'GET') {
            const userId = url.searchParams.get('userId');
            const email = url.searchParams.get('email');
            if (email) {
                const user = await storage_service_1.default.getUserByEmail(email);
                if (!user) {
                    return new Response(JSON.stringify({ error: 'User not found' }), {
                        status: 404,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                return new Response(JSON.stringify({
                    id: user.id,
                    email: user.email
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            if (userId) {
                const user = await storage_service_1.default.getUserById(userId);
                if (!user) {
                    return new Response(JSON.stringify({ error: 'User not found' }), {
                        status: 404,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                return new Response(JSON.stringify({
                    id: user.id,
                    email: user.email
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            return new Response(JSON.stringify({ error: 'userId or email required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        if (method === 'POST') {
            const body = await request.json();
            // Check if user already exists
            if (body.email) {
                const existingUser = await storage_service_1.default.getUserByEmail(body.email);
                if (existingUser) {
                    // Return existing user instead of error for idempotency
                    return new Response(JSON.stringify({
                        id: existingUser.id,
                        email: existingUser.email
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }
            // Create new user (with optional ID in dev mode)
            const user = await storage_service_1.default.createUser(body.email, body.password, body.id // Will only be used in development mode
            );
            return new Response(JSON.stringify({
                id: user.id,
                email: user.email
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // PUT method removed for now - can be added later if needed
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    catch (error) {
        console.error('Storage API error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
