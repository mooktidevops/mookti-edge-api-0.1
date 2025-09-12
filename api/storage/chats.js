"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handler;
require("../../lib/polyfills");
const storage_service_1 = __importDefault(require("../../src/lib/db/storage-service"));
const middleware_1 = require("../../lib/auth/middleware");
const dev_mode_1 = require("../../lib/config/dev-mode");
exports.config = {
    runtime: 'edge',
};
async function handler(request) {
    const url = new URL(request.url);
    const method = request.method;
    // Parse path to handle /api/storage/chats/{id} pattern
    const pathParts = url.pathname.split('/').filter(p => p);
    const chatIdFromPath = pathParts.length > 3 ? pathParts[3] : null;
    (0, dev_mode_1.logDev)('Chat API Request', {
        method,
        pathname: url.pathname,
        pathParts,
        chatIdFromPath,
        searchParams: Object.fromEntries(url.searchParams)
    });
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
    // Verify authentication for all requests
    const user = await (0, middleware_1.verifyApiAuth)(request);
    try {
        if (method === 'GET') {
            const chatId = chatIdFromPath || url.searchParams.get('chatId');
            const userId = url.searchParams.get('userId');
            if (chatId) {
                // Get specific chat
                (0, dev_mode_1.logDev)('Getting chat by ID', { chatId, userId: user?.id });
                const chat = await storage_service_1.default.getChatById(chatId);
                if (!chat) {
                    (0, dev_mode_1.logError)('Chat not found', { chatId, userId: user?.id });
                    return new Response(JSON.stringify({ error: 'Chat not found' }), {
                        status: 404,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                // Check ownership with dev mode support
                const ownershipError = (0, middleware_1.requireOwnership)(user, chat.userId, request);
                if (ownershipError)
                    return ownershipError;
                return new Response(JSON.stringify(chat), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            if (userId) {
                // Require auth to get chats
                const authError = (0, middleware_1.requireAuth)(user);
                if (authError)
                    return authError;
                // Only allow users to get their own chats
                if (user.id !== userId) {
                    return new Response(JSON.stringify({ error: 'Forbidden' }), {
                        status: 403,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                // Get all chats for user
                const chats = await storage_service_1.default.getChatsByUserId(userId);
                return new Response(JSON.stringify(chats), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            return new Response(JSON.stringify({ error: 'userId or chatId required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        if (method === 'POST') {
            // Require auth to create chats
            const authError = (0, middleware_1.requireAuth)(user);
            if (authError)
                return authError;
            const body = await request.json();
            const { userId: bodyUserId, title, visibility, id } = body;
            // In dev mode, allow using the userId from the body if provided
            const devMode = (0, dev_mode_1.isDevMode)(request);
            const userId = (devMode && bodyUserId) ? bodyUserId : user.id;
            (0, dev_mode_1.logDev)('Creating chat', {
                bodyUserId,
                actualUserId: userId,
                devMode,
                title
            });
            const chat = await storage_service_1.default.createChat(userId, title || 'New Chat', visibility || 'private', id // Pass optional ID to storage service
            );
            return new Response(JSON.stringify(chat), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // PUT method removed for now - can be added later when update functionality is needed
        if (method === 'DELETE') {
            // Require auth to delete chats
            const authError = (0, middleware_1.requireAuth)(user);
            if (authError)
                return authError;
            const chatId = url.searchParams.get('chatId');
            if (!chatId) {
                return new Response(JSON.stringify({ error: 'chatId required' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            // Verify user owns the chat before deleting
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
            const deleted = await storage_service_1.default.deleteChat(chatId);
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
