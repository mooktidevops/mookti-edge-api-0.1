"use strict";
// Test endpoint for multi-provider AI chat (NO AUTH - DEV ONLY)
// ⚠️ WARNING: This endpoint has no authentication and should only be used for testing
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handler;
require("../lib/edge-polyfills");
const ai_1 = require("ai");
const model_router_1 = require("../lib/ai/model-router");
exports.config = {
    runtime: 'edge',
};
async function handler(req) {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return new Response('Not available in production', { status: 403 });
    }
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }
    try {
        const body = await req.json();
        const { message, provider = 'anthropic', modelId, stream = false, chatHistory = [] } = body;
        // Route to appropriate model
        const { model } = await (0, model_router_1.routeToModel)({
            provider,
            modelId
        });
        // Build messages
        const messages = [
            ...chatHistory.map(msg => ({
                role: msg.role,
                content: msg.content,
            })),
            { role: 'user', content: message },
        ];
        if (stream) {
            const result = await (0, ai_1.streamText)({
                model,
                messages,
                maxRetries: 1000,
            });
            // Return streaming response
            return new Response(result.toTextStreamResponse().body, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        }
        else {
            const result = await (0, ai_1.generateText)({
                model,
                messages,
                maxRetries: 1000,
            });
            return new Response(result.text, {
                headers: {
                    'Content-Type': 'text/plain',
                },
            });
        }
    }
    catch (error) {
        console.error('Chat error:', error);
        return new Response(JSON.stringify({
            error: error.message || 'Internal server error',
            details: error.toString(),
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
