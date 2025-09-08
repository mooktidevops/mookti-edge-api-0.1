#!/usr/bin/env node

/**
 * Test with logging to debug optimization
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3005';

async function testWithTiming(description, message, context = {}) {
  console.log(`\nTest: ${description}`);
  console.log(`Query: "${message}"`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_URL}/api/ellen/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key'
      },
      body: JSON.stringify({
        message,
        context: {
          userId: 'test-user',
          sessionId: 'test-' + Date.now(),
          ...context
        }
      })
    });

    const latency = Date.now() - startTime;
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Success in ${latency}ms`);
      console.log(`Tools: ${result.toolsUsed?.join(', ')}`);
      
      // Check if optimization indicators are present
      const hasContextRewriter = result.toolsUsed?.includes('context_rewriter');
      const hasRetrieval = result.toolsUsed?.includes('retrieval_aggregator');
      
      console.log(`Context rewriter: ${hasContextRewriter ? 'Used' : 'Skipped'}`);
      console.log(`Retrieval: ${hasRetrieval ? 'Used' : 'Skipped'}`);
      
      return { success: true, latency, tools: result.toolsUsed };
    } else {
      console.log(`❌ Failed with status ${response.status} in ${latency}ms`);
      return { success: false, latency };
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🔍 Testing Optimization Detection\n');
  console.log('=' . repeat(50));
  
  // Test 1: Simple query (should skip context rewrite)
  const test1 = await testWithTiming(
    "Simple self-contained query",
    "What is photosynthesis?"
  );
  
  // Test 2: Meta conversation (should skip retrieval)
  const test2 = await testWithTiming(
    "Meta conversation",
    "Thanks"
  );
  
  // Test 3: Same query again (should use cache)
  const test3 = await testWithTiming(
    "Repeated query (cache test)",
    "What is photosynthesis?"
  );
  
  // Test 4: Query with context (should use all tools)
  const test4 = await testWithTiming(
    "Query with context",
    "Tell me more about that",
    {
      priorTurns: [
        { role: 'user', content: 'What is DNA?' },
        { role: 'assistant', content: 'DNA is...' }
      ]
    }
  );
  
  // Summary
  console.log('\n' + '=' . repeat(50));
  console.log('📊 Summary\n');
  
  const tests = [test1, test2, test3, test4];
  const avgLatency = tests.reduce((sum, t) => sum + (t.latency || 0), 0) / tests.length;
  
  console.log(`Average latency: ${Math.round(avgLatency)}ms`);
  
  // Check if optimizations are working
  const optimizationsWorking = 
    test1.latency < 5000 && // Simple queries should be fast
    test3.latency < test1.latency; // Cache should be faster
    
  if (optimizationsWorking) {
    console.log('✅ Some optimizations appear to be working');
  } else {
    console.log('⚠️ Optimizations may not be fully active');
    console.log('\nPossible issues:');
    console.log('- Query optimizer not integrated properly');
    console.log('- Async/await chain broken');
    console.log('- Console logs not visible in production mode');
  }
}

runTests().catch(console.error);