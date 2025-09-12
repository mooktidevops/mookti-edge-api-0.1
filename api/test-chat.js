"use strict";
/**
 * Test Chat Endpoint - For development testing only
 * Bypasses auth to allow direct chat testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.default = handler;
const ai_1 = require("ai");
const anthropic_1 = require("@ai-sdk/anthropic");
const openai_1 = require("@ai-sdk/openai");
const google_1 = require("@ai-sdk/google");
exports.runtime = 'edge';
async function handler(req) {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }
    try {
        const body = await req.json();
        const { messages, provider = 'openai', stream = true } = body;
        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: 'Messages array required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        // Select model based on provider
        let model;
        switch (provider) {
            case 'anthropic':
                model = (0, anthropic_1.anthropic)('claude-3-haiku-20240307');
                break;
            case 'google':
                model = (0, google_1.google)('gemini-1.5-flash');
                break;
            case 'openai':
            default:
                model = (0, openai_1.openai)('gpt-4o-mini');
                break;
        }
        console.log(`Test chat using ${provider}...`);
        if (stream) {
            const result = await (0, ai_1.streamText)({
                model,
                messages,
                temperature: 0.7,
            });
            // Return streaming response
            return result.toTextStreamResponse();
        }
        else {
            const result = await (0, ai_1.generateText)({
                model,
                messages,
                temperature: 0.7,
            });
            return new Response(JSON.stringify({
                content: result.text,
                provider,
                model: model.modelId,
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    catch (error) {
        console.error('Test chat error:', error);
        return new Response(JSON.stringify({
            error: 'Chat failed',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
