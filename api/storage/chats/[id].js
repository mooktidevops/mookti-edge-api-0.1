"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handler;
require("../../../lib/polyfills");
const storage_service_1 = __importDefault(require("../../../src/lib/db/storage-service"));
const middleware_1 = require("../../../lib/auth/middleware");
exports.config = {
    runtime: 'edge',
};
async function handler(request) {
    const url = new URL(request.url);
    const method = request.method;
    // Extract chat ID from the URL path
    const pathParts = url.pathname.split('/').filter(p => p);
    const chatId = pathParts[pathParts.length - 1];
    // Handle CORS
    if (method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }
    // Verify authentication
    const user = await (0, middleware_1.verifyApiAuth)(request);
    try {
        if (method === 'GET') {
            // Get specific chat
            const chat = await storage_service_1.default.getChatById(chatId);
            if (!chat) {
                return new Response(JSON.stringify({ error: 'Chat not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            // Verify user owns the chat
            const ownershipError = (0, middleware_1.requireOwnership)(user, chat.userId);
            if (ownershipError)
                return ownershipError;
            return new Response(JSON.stringify(chat), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        if (method === 'DELETE') {
            // Require auth to delete
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            // Verify chat exists and user owns it
            const chat = await storage_service_1.default.getChatById(chatId);
            if (!chat) {
                return new Response(JSON.stringify({ error: 'Chat not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            const ownershipError = (0, middleware_1.requireOwnership)(user, chat.userId);
            if (ownershipError)
                return ownershipError;
            await storage_service_1.default.deleteChat(chatId);
            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
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
