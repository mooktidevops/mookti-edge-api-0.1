"use strict";
/**
 * @deprecated This file is deprecated. Use src/services/model-selection.ts instead.
 * The new implementation uses the 4-tier system (1/2/3/4) defined in src/config/model-tiers.ts
 * This file is kept for backwards compatibility but should not be used for new code.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeToModel = routeToModel;
exports.getReasoningModel = getReasoningModel;
exports.getFastModel = getFastModel;
exports.getBudgetModel = getBudgetModel;
exports.getVisionModel = getVisionModel;
const providers_1 = require("./providers");
const models_1 = require("./models");
// Route to the appropriate model based on selection criteria
function routeToModel(request = {}) {
    const availableProviders = (0, providers_1.getAvailableProviders)();
    if (availableProviders.length === 0) {
        throw new Error('No AI providers configured. Please set API keys in environment variables.');
    }
    // If specific model ID is provided, use it directly
    if (request.modelId) {
        const modelConfig = (0, models_1.getModelById)(request.modelId);
        if (!modelConfig) {
            throw new Error(`Model ${request.modelId} not found`);
        }
        if (!availableProviders.includes(modelConfig.provider)) {
            throw new Error(`Provider ${modelConfig.provider} is not configured for model ${request.modelId}`);
        }
        return {
            provider: modelConfig.provider,
            modelId: modelConfig.id,
            modelConfig,
            model: getLanguageModel(modelConfig.provider, modelConfig.id),
        };
    }
    // If specific provider is requested, use it
    let selectedProvider;
    if (request.provider) {
        if (!availableProviders.includes(request.provider)) {
            throw new Error(`Provider ${request.provider} is not configured`);
        }
        selectedProvider = request.provider;
    }
    else {
        selectedProvider = (0, providers_1.getDefaultProvider)();
    }
    // Find suitable model based on criteria
    let candidateModels = models_1.availableModels.filter(model => model.provider === selectedProvider);
    // Filter by tier if specified
    if (request.tier) {
        candidateModels = candidateModels.filter(model => model.tier === request.tier);
    }
    // Filter by cost constraints
    if (request.maxCostPer1kInput !== undefined) {
        candidateModels = candidateModels.filter(model => model.costPer1kInput <= request.maxCostPer1kInput);
    }
    if (request.maxCostPer1kOutput !== undefined) {
        candidateModels = candidateModels.filter(model => model.costPer1kOutput <= request.maxCostPer1kOutput);
    }
    // Filter by capability requirements
    if (request.requireVision) {
        candidateModels = candidateModels.filter(model => model.capabilities.vision);
    }
    if (request.requireFunctionCalling) {
        candidateModels = candidateModels.filter(model => model.capabilities.functionCalling);
    }
    // Select the best model from candidates
    if (candidateModels.length === 0) {
        // Fallback to default model for provider
        const defaultModel = (0, models_1.getDefaultModelForProvider)(selectedProvider);
        if (!defaultModel) {
            throw new Error(`No suitable model found for provider ${selectedProvider}`);
        }
        candidateModels = [defaultModel];
    }
    // Choose the model (prefer by tier: 2 > 3 > 1 for general use)
    const selectedModel = candidateModels.find(m => m.tier === 2) ||
        candidateModels.find(m => m.tier === 3) ||
        candidateModels.find(m => m.tier === 1) ||
        candidateModels[0];
    return {
        provider: selectedProvider,
        modelId: selectedModel.id,
        modelConfig: selectedModel,
        model: getLanguageModel(selectedProvider, selectedModel.id),
    };
}
// Get the actual language model instance from Vercel AI SDK
function getLanguageModel(provider, modelId) {
    const providerInstance = providers_1.providers[provider];
    switch (provider) {
        case 'anthropic':
            return providerInstance(modelId);
        case 'openai':
            return providerInstance(modelId);
        case 'google':
            return providerInstance(modelId);
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}
// Export convenience functions for common use cases
function getReasoningModel(provider) {
    return routeToModel({ provider, tier: 3 });
}
function getFastModel(provider) {
    return routeToModel({ provider, tier: 2 });
}
function getBudgetModel(provider) {
    return routeToModel({ provider, tier: 1 });
}
function getVisionModel(provider) {
    return routeToModel({ provider, requireVision: true });
}
