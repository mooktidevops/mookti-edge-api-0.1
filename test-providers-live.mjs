#!/usr/bin/env node

// Live test script for Vercel AI SDK providers
// Run with: node test-providers-live.mjs

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_AUTH_TOKEN = 'test-token-' + Date.now();

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
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

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'bright');
  console.log('='.repeat(60));
}

async function testProvider(provider, modelId = null) {
  log(`\n🧪 Testing ${provider}${modelId ? ` with ${modelId}` : ''}...`, 'cyan');
  
  const testCases = [
    {
      name: 'Simple completion',
      message: 'What is 2+2? Answer in one word.',
      stream: false
    },
    {
      name: 'Streaming response',
      message: 'Count from 1 to 5 slowly.',
      stream: true
    },
    {
      name: 'Tool use',
      message: 'I need help understanding recursion in programming.',
      stream: false
    }
  ];
  
  for (const testCase of testCases) {
    log(`  📝 ${testCase.name}...`, 'yellow');
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE_URL}/api/chat-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
        },
        body: JSON.stringify({
          message: testCase.message,
          provider: provider || undefined,
          modelId: modelId || undefined,
          stream: testCase.stream,
          useRAG: false // Disable RAG for basic tests
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      let result;
      if (testCase.stream) {
        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let chunks = 0;
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          chunks++;
          
          // Parse SSE chunks
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) {
                  fullText += data.text;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
        
        result = {
          content: fullText,
          chunks: chunks,
          streaming: true
        };
      } else {
        // Handle regular response
        result = await response.json();
      }
      
      const duration = Date.now() - startTime;
      
      log(`     ✅ Success (${duration}ms)`, 'green');
      log(`     📊 Response: ${result.content?.substring(0, 100)}...`, 'reset');
      
      if (result.provider) {
        log(`     🏷️  Provider: ${result.provider}, Model: ${result.model}`, 'reset');
      }
      
      if (result.usage) {
        log(`     💰 Tokens: ${result.usage.input_tokens} in, ${result.usage.output_tokens} out`, 'reset');
      }
      
      if (result.toolCalls && result.toolCalls.length > 0) {
        log(`     🔧 Tools used: ${result.toolCalls.map(t => t.tool || t.name).join(', ')}`, 'magenta');
      }
      
      if (result.streaming) {
        log(`     📦 Stream chunks: ${result.chunks}`, 'reset');
      }
      
    } catch (error) {
      log(`     ❌ Failed: ${error.message}`, 'red');
    }
  }
}

async function testRAGIntegration() {
  log('\n🔍 Testing RAG Integration...', 'cyan');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
      },
      body: JSON.stringify({
        message: 'What are the key principles of workplace communication?',
        useRAG: true,
        topK: 3,
        stream: false
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.ragUsed) {
      log('  ✅ RAG enabled and working', 'green');
      log(`  📚 Content retrieved and used in response`, 'reset');
    } else {
      log('  ⚠️  RAG was disabled or no relevant content found', 'yellow');
    }
    
  } catch (error) {
    log(`  ❌ RAG test failed: ${error.message}`, 'red');
  }
}

async function testProviderAvailability() {
  log('\n🔌 Checking Provider Availability...', 'cyan');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/test-providers`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    log(`  Available providers: ${result.availableProviders.join(', ') || 'none'}`, 'reset');
    
    for (const provider of result.availableProviders) {
      const test = result.providerTests[provider];
      if (test && test.success) {
        log(`  ✅ ${provider}: ${test.modelName} working`, 'green');
      } else if (test) {
        log(`  ❌ ${provider}: ${test.error}`, 'red');
      }
    }
    
    if (result.defaultRouting) {
      log(`  🎯 Default routing: ${result.defaultRouting.modelName} (${result.defaultRouting.provider})`, 'blue');
    }
    
    return result.availableProviders;
    
  } catch (error) {
    log(`  ❌ Provider check failed: ${error.message}`, 'red');
    return [];
  }
}

async function testModelSelection() {
  log('\n🎯 Testing Model Selection...', 'cyan');
  
  const modelTests = [
    { provider: 'anthropic', modelId: 'claude-3-5-sonnet-20241022' },
    { provider: 'openai', modelId: 'gpt-4o' },
    { provider: 'google', modelId: 'gemini-1.5-flash' }
  ];
  
  for (const test of modelTests) {
    log(`  Testing ${test.modelId}...`, 'yellow');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`
        },
        body: JSON.stringify({
          message: 'Say hello!',
          provider: test.provider,
          modelId: test.modelId,
          stream: false,
          useRAG: false
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.model === test.modelId) {
        log(`    ✅ Correct model used: ${test.modelId}`, 'green');
      } else {
        log(`    ⚠️  Different model used: ${result.model}`, 'yellow');
      }
      
    } catch (error) {
      log(`    ❌ Failed: ${error.message}`, 'red');
    }
  }
}

async function runAllTests() {
  logSection('🚀 Mookti Multi-Provider API Test Suite');
  
  log('\nConfiguration:', 'bright');
  log(`  API URL: ${API_BASE_URL}`);
  log(`  Anthropic API: ${process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing'}`);
  log(`  OpenAI API: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  log(`  Google AI API: ${process.env.GOOGLE_GENERATIVE_AI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  
  // Check provider availability first
  logSection('Provider Availability');
  const availableProviders = await testProviderAvailability();
  
  if (availableProviders.length === 0) {
    log('\n❌ No providers available. Please check API keys.', 'red');
    return;
  }
  
  // Test each available provider
  logSection('Provider-Specific Tests');
  for (const provider of availableProviders) {
    await testProvider(provider);
  }
  
  // Test model selection
  logSection('Model Selection Tests');
  await testModelSelection();
  
  // Test RAG integration
  logSection('RAG Integration Test');
  await testRAGIntegration();
  
  logSection('✨ Test Suite Complete');
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run the tests
runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});