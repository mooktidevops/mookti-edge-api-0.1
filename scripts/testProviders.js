#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const ai_1 = require("ai");
const providers_1 = require("../lib/ai/providers");
const model_router_1 = require("../lib/ai/model-router");
const models_1 = require("../lib/ai/models");
// Load environment variables
dotenv_1.default.config();
async function testProvider(providerName) {
    console.log(`\n🧪 Testing ${providerName} provider...`);
    if (!(0, providers_1.isProviderAvailable)(providerName)) {
        console.log(`❌ ${providerName} is not configured (missing API key)`);
        return;
    }
    try {
        // Get a fast model for testing
        const { model, modelConfig } = (0, model_router_1.getFastModel)(providerName);
        console.log(`✅ Provider available`);
        console.log(`📦 Using model: ${modelConfig.name} (${modelConfig.id})`);
        console.log(`💰 Cost: $${modelConfig.costPer1kInput}/1k input, $${modelConfig.costPer1kOutput}/1k output`);
        // Test simple generation
        console.log(`🔄 Testing text generation...`);
        const result = await (0, ai_1.generateText)({
            model,
            prompt: 'Say "Hello from ' + providerName + '" in exactly 5 words.',
        });
        console.log(`📝 Response: ${result.text}`);
        console.log(`📊 Tokens used: ${result.usage?.totalTokens || 'N/A'}`);
        console.log(`✅ ${providerName} test completed successfully!`);
    }
    catch (error) {
        console.error(`❌ Error testing ${providerName}:`, error.message);
        if (error.message.includes('API key')) {
            console.log(`💡 Hint: Make sure to set the correct API key in .env file`);
        }
    }
}
async function listAvailableModels() {
    console.log('\n📋 Available Models Configuration:');
    console.log('==================================');
    const providers = ['anthropic', 'openai', 'google'];
    for (const provider of providers) {
        const isAvailable = (0, providers_1.isProviderAvailable)(provider);
        const status = isAvailable ? '✅' : '❌';
        console.log(`\n${status} ${provider.toUpperCase()} (${isAvailable ? 'configured' : 'not configured'})`);
        const providerModels = models_1.availableModels.filter(m => m.provider === provider);
        for (const model of providerModels) {
            console.log(`  - ${model.name} [${model.tier}]`);
            console.log(`    ID: ${model.id}`);
            console.log(`    Context: ${model.contextWindow.toLocaleString()} tokens`);
            console.log(`    Features: ${Object.entries(model.capabilities)
                .filter(([_, v]) => v)
                .map(([k]) => k)
                .join(', ')}`);
        }
    }
}
async function testModelRouting() {
    console.log('\n🔄 Testing Model Routing:');
    console.log('========================');
    const availableProviders = (0, providers_1.getAvailableProviders)();
    console.log(`Available providers: ${availableProviders.join(', ') || 'none'}`);
    if (availableProviders.length === 0) {
        console.log('❌ No providers configured. Please set at least one API key.');
        return;
    }
    try {
        // Test different routing scenarios
        console.log('\n1️⃣ Default routing:');
        const defaultRoute = (0, model_router_1.routeToModel)();
        console.log(`   → ${defaultRoute.modelConfig.name} (${defaultRoute.provider})`);
        console.log('\n2️⃣ Budget model routing:');
        const budgetRoute = (0, model_router_1.getBudgetModel)();
        console.log(`   → ${budgetRoute.modelConfig.name} (${budgetRoute.provider})`);
        console.log('\n3️⃣ Reasoning model routing:');
        const reasoningRoute = (0, model_router_1.getReasoningModel)();
        console.log(`   → ${reasoningRoute.modelConfig.name} (${reasoningRoute.provider})`);
    }
    catch (error) {
        console.error('❌ Routing error:', error.message);
    }
}
async function main() {
    console.log('🚀 Mookti AI Provider Test Suite');
    console.log('=================================');
    // List all available models
    await listAvailableModels();
    // Test model routing
    await testModelRouting();
    // Test each provider if configured
    const providers = ['anthropic', 'openai', 'google'];
    for (const provider of providers) {
        await testProvider(provider);
    }
    console.log('\n✨ All tests completed!');
}
// Run the tests
main().catch(console.error);
