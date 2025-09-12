"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.availableModels = void 0;
exports.getModelsByProvider = getModelsByProvider;
exports.getModelsByTier = getModelsByTier;
exports.getModelById = getModelById;
exports.getDefaultModelForProvider = getDefaultModelForProvider;
// Available models catalog - ONLY current/future models we're using
exports.availableModels = [
    // Anthropic models - Current generation
    {
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4.1',
        provider: 'anthropic',
        contextWindow: 200000,
        maxOutputTokens: 32000,
        costPer1kInput: 0.015,
        costPer1kOutput: 0.075,
        capabilities: {
            streaming: true,
            functionCalling: true,
            vision: true,
        },
        tier: 4,
    },
    {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        provider: 'anthropic',
        contextWindow: 200000,
        maxOutputTokens: 64000,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015,
        capabilities: {
            streaming: true,
            functionCalling: true,
            vision: true,
        },
        tier: 2,
    },
    {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        contextWindow: 200000,
        maxOutputTokens: 8192,
        costPer1kInput: 0.0008,
        costPer1kOutput: 0.004,
        capabilities: {
            streaming: true,
            functionCalling: true,
            vision: false,
        },
        tier: 1,
    },
    // OpenAI models - GPT-5 series (when available)
    {
        id: 'gpt-5',
        name: 'GPT-5',
        provider: 'openai',
        contextWindow: 272000,
        maxOutputTokens: 128000,
        costPer1kInput: 0.00125,
        costPer1kOutput: 0.01,
        capabilities: {
            streaming: true,
            functionCalling: true,
            vision: true,
        },
        tier: 4,
    },
    {
        id: 'gpt-5-mini',
        name: 'GPT-5 Mini',
        provider: 'openai',
        contextWindow: 272000,
        maxOutputTokens: 128000,
        costPer1kInput: 0.00025,
        costPer1kOutput: 0.002,
        capabilities: {
            streaming: true,
            functionCalling: true,
            vision: true,
        },
        tier: 2,
    },
    {
        id: 'gpt-5-nano',
        name: 'GPT-5 Nano',
        provider: 'openai',
        contextWindow: 272000,
        maxOutputTokens: 128000,
        costPer1kInput: 0.00005,
        costPer1kOutput: 0.0004,
        capabilities: {
            streaming: true,
            functionCalling: true,
            vision: true,
        },
        tier: 1,
    },
    // OpenAI models - Current GPT-4 (keep these as they're still widely used)
    {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        contextWindow: 128000,
        maxOutputTokens: 16384,
        costPer1kInput: 0.0025,
        costPer1kOutput: 0.01,
        capabilities: {
            streaming: true,
            functionCalling: true,
            vision: true,
        },
        tier: 2,
    },
    {
        id: 'gpt-4o-mini',
        name: 'GPT-4o mini',
        provider: 'openai',
        contextWindow: 128000,
        maxOutputTokens: 16384,
        costPer1kInput: 0.00015,
        costPer1kOutput: 0.0006,
        capabilities: {
            streaming: true,
            functionCalling: true,
            vision: true,
        },
        tier: 1,
    },
    // O-series reasoning models (when available)
    {
        id: 'o3',
        name: 'O3',
        provider: 'openai',
        contextWindow: 200000,
        maxOutputTokens: 100000,
        costPer1kInput: 0.011,
        costPer1kOutput: 0.044,
        capabilities: {
            streaming: true,
            functionCalling: true,
            vision: true,
        },
        tier: 4,
    },
    {
        id: 'o3-mini',
        name: 'O3-Mini',
        provider: 'openai',
        contextWindow: 200000,
        maxOutputTokens: 100000,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.012,
        capabilities: {
            streaming: true,
            functionCalling: true,
            vision: true,
        },
        tier: 3,
    },
    {
        id: 'o4-mini',
        name: 'O4-Mini',
        provider: 'openai',
        contextWindow: 200000,
        maxOutputTokens: 100000,
        costPer1kInput: 0.0006,
        costPer1kOutput: 0.0024,
        capabilities: {
            streaming: true,
            functionCalling: true,
            vision: true,
        },
        tier: 3,
    },
    // Google models - Gemini 2.x series
    {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        provider: 'google',
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        costPer1kInput: 0.00125, // $1.25 per M for standard, $4 for long context
        costPer1kOutput: 0.005, // $5 per M for standard, $20 for long context
        capabilities: {
            streaming: true,
            functionCalling: true,
            vision: true,
        },
        tier: 4,
    },
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'google',
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        costPer1kInput: 0.000075,
        costPer1kOutput: 0.0003,
        capabilities: {
            streaming: true,
            functionCalling: true,
            vision: true,
        },
        tier: 2,
    },
    {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash-Lite',
        provider: 'google',
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        costPer1kInput: 0.00002,
        costPer1kOutput: 0.00008,
        capabilities: {
            streaming: true,
            functionCalling: true,
            vision: false,
        },
        tier: 1,
    },
    {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        costPer1kInput: 0.000075,
        costPer1kOutput: 0.0003,
        capabilities: {
            streaming: true,
            functionCalling: true,
            vision: true,
        },
        tier: 2,
    },
];
// Get models by provider
function getModelsByProvider(provider) {
    return exports.availableModels.filter(model => model.provider === provider);
}
// Get models by tier
function getModelsByTier(tier) {
    return exports.availableModels.filter(model => model.tier === tier);
}
// Get model by ID
function getModelById(modelId) {
    return exports.availableModels.find(model => model.id === modelId);
}
// Get default model for a provider
function getDefaultModelForProvider(provider) {
    const models = getModelsByProvider(provider);
    // Return the tier 2 (balanced) model as default, or the first available
    return models.find(m => m.tier === 2) || models[0];
}
