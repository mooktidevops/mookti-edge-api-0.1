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
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }
    try {
        if (method === 'GET') {
            const chatId = url.searchParams.get('chatId');
            const messageId = url.searchParams.get('messageId');
            const limit = url.searchParams.get('limit');
            if (!chatId) {
                return new Response(JSON.stringify({ error: 'chatId required' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            // Get all messages for chat
            const messages = await storage_service_1.default.getMessagesByChatId(chatId);
            return new Response(JSON.stringify(messages), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        if (method === 'POST') {
            const body = await request.json();
            const { chatId, role, parts, attachments } = body;
            if (!chatId || !role || !parts) {
                return new Response(JSON.stringify({ error: 'chatId, role, and parts are required' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            const message = await storage_service_1.default.createMessage(chatId, role, parts, attachments || []);
            return new Response(JSON.stringify(message), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        if (method === 'DELETE') {
            const chatId = url.searchParams.get('chatId');
            const afterTimestamp = url.searchParams.get('afterTimestamp');
            if (!chatId || !afterTimestamp) {
                return new Response(JSON.stringify({ error: 'chatId and afterTimestamp required' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            const deleted = await storage_service_1.default.deleteMessagesAfterTimestamp(chatId, new Date(afterTimestamp));
            return new Response(JSON.stringify({ deleted }), {
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
