"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.entitlementConfigs = void 0;
exports.canAccessModel = canAccessModel;
exports.getUserEntitlement = getUserEntitlement;
exports.getEntitledModels = getEntitledModels;
exports.checkUsageLimits = checkUsageLimits;
// Default entitlement configurations
exports.entitlementConfigs = {
    free: {
        tier: 'free',
        allowedProviders: ['anthropic'], // Limited to one provider
        allowedModelTiers: [1],
        maxRequestsPerDay: 50,
        maxTokensPerRequest: 2000,
        maxTokensPerMonth: 50000,
        features: {
            ragEnabled: false,
            toolsEnabled: false,
            visionEnabled: false,
            customSystemPrompts: false,
            priorityQueue: false,
        },
    },
    basic: {
        tier: 'basic',
        allowedProviders: ['anthropic', 'openai'],
        allowedModelTiers: [1, 2],
        maxRequestsPerDay: 500,
        maxTokensPerRequest: 4000,
        maxTokensPerMonth: 500000,
        features: {
            ragEnabled: true,
            toolsEnabled: true,
            visionEnabled: false,
            customSystemPrompts: false,
            priorityQueue: false,
        },
    },
    pro: {
        tier: 'pro',
        allowedProviders: ['anthropic', 'openai', 'google'],
        allowedModelTiers: [1, 2, 3],
        maxRequestsPerDay: 2000,
        maxTokensPerRequest: 8000,
        maxTokensPerMonth: 2000000,
        features: {
            ragEnabled: true,
            toolsEnabled: true,
            visionEnabled: true,
            customSystemPrompts: true,
            priorityQueue: true,
        },
    },
    enterprise: {
        tier: 'enterprise',
        allowedProviders: ['anthropic', 'openai', 'google'],
        allowedModelTiers: [1, 2, 3, 4],
        maxRequestsPerDay: 10000,
        maxTokensPerRequest: 32000,
        maxTokensPerMonth: 10000000,
        features: {
            ragEnabled: true,
            toolsEnabled: true,
            visionEnabled: true,
            customSystemPrompts: true,
            priorityQueue: true,
        },
    },
};
// Check if a user can access a specific model
function canAccessModel(userTier, modelConfig) {
    const entitlement = exports.entitlementConfigs[userTier];
    // Check provider access
    if (!entitlement.allowedProviders.includes(modelConfig.provider)) {
        return false;
    }
    // Check model tier access
    if (modelConfig.tier && !entitlement.allowedModelTiers.includes(modelConfig.tier)) {
        return false;
    }
    // Check vision capability if model requires it
    if (modelConfig.capabilities.vision && !entitlement.features.visionEnabled) {
        return false;
    }
    return true;
}
// Get user's entitlement configuration
function getUserEntitlement(userTier) {
    return exports.entitlementConfigs[userTier];
}
// Filter available models based on user entitlements
function getEntitledModels(userTier, allModels) {
    return allModels.filter(model => canAccessModel(userTier, model));
}
// Check if user has exceeded limits
function checkUsageLimits(userTier, currentUsage, requestTokens) {
    const entitlement = exports.entitlementConfigs[userTier];
    // Check daily request limit
    if (currentUsage.requestCount >= entitlement.maxRequestsPerDay) {
        return { allowed: false, reason: 'Daily request limit exceeded' };
    }
    // Check per-request token limit
    if (requestTokens > entitlement.maxTokensPerRequest) {
        return { allowed: false, reason: 'Request token limit exceeded' };
    }
    // Check monthly token limit (assuming currentUsage.tokenCount is monthly)
    if (currentUsage.tokenCount + requestTokens > entitlement.maxTokensPerMonth) {
        return { allowed: false, reason: 'Monthly token limit exceeded' };
    }
    return { allowed: true };
}
