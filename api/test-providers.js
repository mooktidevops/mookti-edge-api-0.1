"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const ai_1 = require("ai");
const providers_1 = require("../lib/ai/providers");
const model_router_1 = require("../lib/ai/model-router");
async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const results = {
        availableProviders: [],
        providerTests: {},
        timestamp: new Date().toISOString(),
    };
    try {
        // Check available providers
        const availableProviders = (0, providers_1.getAvailableProviders)();
        results.availableProviders = availableProviders;
        if (availableProviders.length === 0) {
            results.error = 'No providers configured. Please set API keys.';
            return res.status(200).json(results);
        }
        // Test each available provider
        for (const provider of availableProviders) {
            try {
                const { model, modelConfig } = (0, model_router_1.getFastModel)(provider);
                // Simple test generation
                const testResult = await (0, ai_1.generateText)({
                    model,
                    prompt: `Say "Hello from ${provider}" in exactly 5 words.`,
                });
                results.providerTests[provider] = {
                    success: true,
                    model: modelConfig.id,
                    modelName: modelConfig.name,
                    response: testResult.text,
                    tokensUsed: testResult.usage?.totalTokens || 0,
                };
            }
            catch (error) {
                results.providerTests[provider] = {
                    success: false,
                    error: error.message,
                };
            }
        }
        // Test default routing
        try {
            const defaultRoute = (0, model_router_1.routeToModel)();
            results.defaultRouting = {
                provider: defaultRoute.provider,
                modelId: defaultRoute.modelId,
                modelName: defaultRoute.modelConfig.name,
            };
        }
        catch (error) {
            results.defaultRouting = {
                error: error.message,
            };
        }
        res.status(200).json(results);
    }
    catch (error) {
        res.status(500).json({
            error: 'Test failed',
            message: error.message,
            availableProviders: results.availableProviders,
        });
    }
}
