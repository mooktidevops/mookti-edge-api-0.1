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
exports.config = {
    runtime: 'edge',
};
async function handler(request) {
    const url = new URL(request.url);
    const method = request.method;
    // CORS
    if (method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }
    // Auth
    const user = await (0, middleware_1.verifyApiAuth)(request);
    try {
        if (method === 'GET') {
            const chatId = url.searchParams.get('chatId');
            if (!chatId) {
                return new Response(JSON.stringify({ error: 'chatId required' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            // Ownership check (allow bypass in dev)
            const chat = await storage_service_1.default.getChatById(chatId);
            if (!chat) {
                return new Response(JSON.stringify({ error: 'Chat not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            const ownershipError = (0, middleware_1.requireOwnership)(user, chat.userId, request);
            if (ownershipError)
                return ownershipError;
            const votes = await storage_service_1.default.getVotesByChatId(chatId);
            return new Response(JSON.stringify(votes), {
                headers: { 'Content-Type': 'application/json' },
            });
        }
        if (method === 'POST') {
            const authError = (0, middleware_1.requireAuth)(user);
            if (authError)
                return authError;
            const body = (await request.json());
            const { chatId, messageId, isUpvoted } = body;
            if (!chatId || !messageId || typeof isUpvoted !== 'boolean') {
                return new Response(JSON.stringify({ error: 'chatId, messageId and isUpvoted are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }
            // Ownership check (allow bypass in dev)
            const chat = await storage_service_1.default.getChatById(chatId);
            if (!chat) {
                return new Response(JSON.stringify({ error: 'Chat not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            const ownershipError = (0, middleware_1.requireOwnership)(user, chat.userId, request);
            if (ownershipError)
                return ownershipError;
            const vote = await storage_service_1.default.createOrUpdateVote(chatId, messageId, isUpvoted);
            return new Response(JSON.stringify(vote), {
                headers: { 'Content-Type': 'application/json' },
            });
        }
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    catch (error) {
        console.error('Votes API error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error', message: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
