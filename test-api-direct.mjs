#!/usr/bin/env node

// Direct API test without server
// Run with: node test-api-direct.mjs

import dotenv from 'dotenv';
import { generateText, streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

// Load environment variables
dotenv.config();

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Initialize providers
const providers = {
  anthropic: process.env.ANTHROPIC_API_KEY ? createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  }) : null,
  openai: process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE' ? createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  }) : null,
  google: process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GOOGLE_GENERATIVE_AI_API_KEY !== 'YOUR_GOOGLE_AI_API_KEY_HERE' ? createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  }) : null,
};

// Model configurations
const models = {
  anthropic: {
    fast: 'claude-3-5-sonnet-20241022',
    budget: 'claude-3-5-haiku-20241022',
    reasoning: 'claude-3-opus-20240229'
  },
  openai: {
    fast: 'gpt-4o',
    budget: 'gpt-4o-mini',
    reasoning: 'gpt-4-turbo'
  },
  google: {
    fast: 'gemini-1.5-flash',
    budget: 'gemini-1.5-flash',
    reasoning: 'gemini-1.5-pro'
  }
};

async function testProvider(providerName, provider) {
  log(`\n📦 Testing ${providerName}...`, 'cyan');
  
  if (!provider) {
    log(`  ❌ ${providerName} not configured (missing/invalid API key)`, 'red');
    return false;
  }
  
  const modelId = models[providerName]?.fast;
  if (!modelId) {
    log(`  ❌ No model configured for ${providerName}`, 'red');
    return false;
  }
  
  try {
    log(`  🎯 Using model: ${modelId}`, 'yellow');
    
    // Test 1: Simple generation
    log(`  📝 Test 1: Simple generation...`);
    const startTime = Date.now();
    
    const model = provider(modelId);
    const result = await generateText({
      model,
      prompt: `Say "Hello from ${providerName}" and nothing else.`,
      temperature: 0.3,
    });
    
    const duration = Date.now() - startTime;
    log(`    ✅ Response: ${result.text}`, 'green');
    log(`    ⏱️  Time: ${duration}ms`);
    log(`    📊 Tokens: ${result.usage?.totalTokens || 'N/A'}`);
    
    // Test 2: Streaming
    log(`  📝 Test 2: Streaming test...`);
    const streamStart = Date.now();
    
    const stream = await streamText({
      model,
      prompt: 'Count from 1 to 3, one number per line.',
      temperature: 0.3,
    });
    
    let streamContent = '';
    let chunks = 0;
    for await (const part of stream.textStream) {
      streamContent += part;
      chunks++;
    }
    
    const streamDuration = Date.now() - streamStart;
    log(`    ✅ Streamed ${chunks} chunks in ${streamDuration}ms`, 'green');
    log(`    📄 Content: ${streamContent.replace(/\n/g, ' ')}`);
    
    // Test 3: System message
    log(`  📝 Test 3: System message test...`);
    const sysResult = await generateText({
      model,
      system: 'You are a helpful assistant who always responds in exactly 3 words.',
      prompt: 'What is the weather like?',
      temperature: 0.3,
    });
    
    log(`    ✅ Response: ${sysResult.text}`, 'green');
    
    log(`  ✅ ${providerName} tests passed!`, 'green');
    return true;
    
  } catch (error) {
    log(`  ❌ ${providerName} test failed: ${error.message}`, 'red');
    if (error.message.includes('API key')) {
      log(`    💡 Check your ${providerName.toUpperCase()}_API_KEY in .env`, 'yellow');
    }
    return false;
  }
}

async function testCrossProviderConsistency() {
  log('\n🔄 Testing Cross-Provider Consistency...', 'cyan');
  
  const testPrompt = 'What is 2+2? Answer with just the number.';
  const results = {};
  
  for (const [name, provider] of Object.entries(providers)) {
    if (!provider) continue;
    
    try {
      const modelId = models[name]?.budget; // Use budget tier for cost
      const model = provider(modelId);
      
      const result = await generateText({
        model,
        prompt: testPrompt,
        temperature: 0, // Zero temperature for consistency
      });
      
      results[name] = result.text.trim();
      log(`  ${name}: "${results[name]}"`, 'blue');
      
    } catch (error) {
      log(`  ${name}: Failed - ${error.message}`, 'red');
    }
  }
  
  // Check if all results are the same
  const values = Object.values(results);
  if (values.length > 1 && values.every(v => v === values[0])) {
    log('  ✅ All providers gave consistent answers!', 'green');
  } else if (values.length > 1) {
    log('  ⚠️  Providers gave different answers', 'yellow');
  }
}

async function main() {
  console.log('='.repeat(60));
  log('  🚀 Mookti Multi-Provider Direct Test', 'cyan');
  console.log('='.repeat(60));
  
  // Show configuration
  log('\n📋 Configuration:');
  log(`  Anthropic: ${providers.anthropic ? '✅ Ready' : '❌ Not configured'}`);
  log(`  OpenAI: ${providers.openai ? '✅ Ready' : '❌ Not configured'}`);
  log(`  Google: ${providers.google ? '✅ Ready' : '❌ Not configured'}`);
  
  // Count available providers
  const availableCount = Object.values(providers).filter(p => p !== null).length;
  
  if (availableCount === 0) {
    log('\n❌ No providers configured! Please add API keys to .env file:', 'red');
    log('  ANTHROPIC_API_KEY=your-key-here', 'yellow');
    log('  OPENAI_API_KEY=your-key-here', 'yellow');
    log('  GOOGLE_GENERATIVE_AI_API_KEY=your-key-here', 'yellow');
    process.exit(1);
  }
  
  log(`\n✨ Testing ${availableCount} provider(s)...`, 'magenta');
  
  // Test each provider
  let successCount = 0;
  for (const [name, provider] of Object.entries(providers)) {
    if (await testProvider(name, provider)) {
      successCount++;
    }
  }
  
  // Test cross-provider consistency if multiple providers
  if (successCount > 1) {
    await testCrossProviderConsistency();
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  if (successCount === availableCount && successCount > 0) {
    log(`  ✅ All ${successCount} provider(s) working correctly!`, 'green');
  } else if (successCount > 0) {
    log(`  ⚠️  ${successCount}/${availableCount} providers working`, 'yellow');
  } else {
    log(`  ❌ No providers working`, 'red');
  }
  console.log('='.repeat(60));
}

// Run tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});