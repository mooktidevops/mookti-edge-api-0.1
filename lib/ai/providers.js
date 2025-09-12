"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providers = void 0;
exports.isProviderAvailable = isProviderAvailable;
exports.getAvailableProviders = getAvailableProviders;
exports.getDefaultProvider = getDefaultProvider;
const anthropic_1 = require("@ai-sdk/anthropic");
const openai_1 = require("@ai-sdk/openai");
const google_1 = require("@ai-sdk/google");
// Initialize AI providers with API keys from environment variables
exports.providers = {
    anthropic: (0, anthropic_1.createAnthropic)({
        apiKey: process.env.ANTHROPIC_API_KEY,
    }),
    openai: (0, openai_1.createOpenAI)({
        apiKey: process.env.OPENAI_API_KEY,
    }),
    google: (0, google_1.createGoogleGenerativeAI)({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    }),
};
// Check if a provider is available (has API key configured)
function isProviderAvailable(provider) {
    switch (provider) {
        case 'anthropic':
            return !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'YOUR_ANTHROPIC_API_KEY_HERE';
        case 'openai':
            return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE';
        case 'google':
            return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GOOGLE_GENERATIVE_AI_API_KEY !== 'YOUR_GOOGLE_AI_API_KEY_HERE';
        default:
            return false;
    }
}
// Get all available providers
function getAvailableProviders() {
    return Object.keys(exports.providers).filter(isProviderAvailable);
}
// Default provider (fallback)
function getDefaultProvider() {
    const available = getAvailableProviders();
    if (available.length === 0) {
        throw new Error('No AI providers configured. Please set at least one API key in environment variables.');
    }
    // Prefer Anthropic, then OpenAI, then Google
    if (available.includes('anthropic'))
        return 'anthropic';
    if (available.includes('openai'))
        return 'openai';
    return available[0];
}
