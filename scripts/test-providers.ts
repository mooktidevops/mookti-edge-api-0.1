#!/usr/bin/env tsx

// Test script for multi-provider AI chat functionality

const API_URL = process.env.API_URL || 'http://localhost:3002';

interface TestResult {
  provider: string;
  model: string;
  success: boolean;
  response?: string;
  error?: string;
  duration?: number;
}

async function testProvider(provider: string, model: string): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_URL}/api/chat-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: "Hello! Please respond with just your model name and provider.",
        provider,
        modelId: model,
        stream: false,
        chatHistory: [],
        useRAG: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        provider,
        model,
        success: false,
        error: `HTTP ${response.status}: ${error}`,
      };
    }

    const data = await response.text();
    const duration = Date.now() - startTime;
    
    return {
      provider,
      model,
      success: true,
      response: data.substring(0, 100) + (data.length > 100 ? '...' : ''),
      duration,
    };
  } catch (error: any) {
    return {
      provider,
      model,
      success: false,
      error: error.message,
    };
  }
}

async function main() {
  console.log('🧪 Testing Multi-Provider AI Integration...\n');

  const tests = [
    { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' },
    { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
    { provider: 'anthropic', model: 'claude-3-opus-20240229' },
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'openai', model: 'gpt-4-turbo' },
    { provider: 'openai', model: 'gpt-4o-mini' },
    { provider: 'google', model: 'gemini-1.5-pro' },
    { provider: 'google', model: 'gemini-1.5-flash' },
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    console.log(`Testing ${test.provider}/${test.model}...`);
    const result = await testProvider(test.provider, test.model);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${test.provider}/${test.model} - Success (${result.duration}ms)`);
      console.log(`   Response: ${result.response}\n`);
    } else {
      console.log(`❌ ${test.provider}/${test.model} - Failed`);
      console.log(`   Error: ${result.error}\n`);
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some providers failed. Check API keys and configuration.');
  } else {
    console.log('\n🎉 All providers working correctly!');
  }
}

main().catch(console.error);