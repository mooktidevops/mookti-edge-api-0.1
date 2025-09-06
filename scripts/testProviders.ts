#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { generateText } from 'ai';
import { getAvailableProviders, isProviderAvailable } from '../lib/ai/providers';
import { routeToModel, getFastModel, getReasoningModel, getBudgetModel } from '../lib/ai/model-router';
import { availableModels } from '../lib/ai/models';

// Load environment variables
dotenv.config();

async function testProvider(providerName: string) {
  console.log(`\n🧪 Testing ${providerName} provider...`);
  
  if (!isProviderAvailable(providerName as any)) {
    console.log(`❌ ${providerName} is not configured (missing API key)`);
    return;
  }

  try {
    // Get a fast model for testing
    const { model, modelConfig } = getFastModel(providerName as any);
    
    console.log(`✅ Provider available`);
    console.log(`📦 Using model: ${modelConfig.name} (${modelConfig.id})`);
    console.log(`💰 Cost: $${modelConfig.costPer1kInput}/1k input, $${modelConfig.costPer1kOutput}/1k output`);
    
    // Test simple generation
    console.log(`🔄 Testing text generation...`);
    const result = await generateText({
      model,
      prompt: 'Say "Hello from ' + providerName + '" in exactly 5 words.',
    });
    
    console.log(`📝 Response: ${result.text}`);
    console.log(`📊 Tokens used: ${result.usage?.totalTokens || 'N/A'}`);
    console.log(`✅ ${providerName} test completed successfully!`);
    
  } catch (error: any) {
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
    const isAvailable = isProviderAvailable(provider as any);
    const status = isAvailable ? '✅' : '❌';
    console.log(`\n${status} ${provider.toUpperCase()} (${isAvailable ? 'configured' : 'not configured'})`);
    
    const providerModels = availableModels.filter(m => m.provider === provider);
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
  
  const availableProviders = getAvailableProviders();
  console.log(`Available providers: ${availableProviders.join(', ') || 'none'}`);
  
  if (availableProviders.length === 0) {
    console.log('❌ No providers configured. Please set at least one API key.');
    return;
  }
  
  try {
    // Test different routing scenarios
    console.log('\n1️⃣ Default routing:');
    const defaultRoute = routeToModel();
    console.log(`   → ${defaultRoute.modelConfig.name} (${defaultRoute.provider})`);
    
    console.log('\n2️⃣ Budget model routing:');
    const budgetRoute = getBudgetModel();
    console.log(`   → ${budgetRoute.modelConfig.name} (${budgetRoute.provider})`);
    
    console.log('\n3️⃣ Reasoning model routing:');
    const reasoningRoute = getReasoningModel();
    console.log(`   → ${reasoningRoute.modelConfig.name} (${reasoningRoute.provider})`);
    
  } catch (error: any) {
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