#!/usr/bin/env node

/**
 * Test retrieval skipping with Tier 1 model classification
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3006';

async function testQuery(description, message) {
  console.log(`\n=== ${description} ===`);
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
          sessionId: 'retrieval-test-' + Date.now()
        }
      })
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const result = await response.json();
      const hasRetrieval = result.toolsUsed?.includes('retrieval_aggregator');
      
      console.log(`✅ Response in ${responseTime}ms`);
      console.log(`   Tools: ${result.toolsUsed?.join(' → ')}`);
      console.log(`   Retrieval: ${hasRetrieval ? '❌ USED (slow)' : '✅ SKIPPED (fast)'}`);
      
      return { responseTime, hasRetrieval };
    } else {
      console.log(`❌ Failed: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('RETRIEVAL SKIPPING TEST');
  console.log('=' .repeat(50));
  console.log('Testing if Tier 1 model correctly identifies when retrieval is needed\n');
  
  const tests = [
    { description: "Simple arithmetic (should skip)", message: "What is 2+2?" },
    { description: "Complex concept (needs retrieval)", message: "What is photosynthesis?" },
    { description: "Meta conversation (should skip)", message: "Thanks" },
    { description: "Complex request (needs retrieval)", message: "Explain quantum mechanics" },
    { description: "Yes/No question (should skip)", message: "Is 5 greater than 3?" },
    { description: "Calculation (should skip)", message: "Calculate 15 * 7" },
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await testQuery(test.description, test.message);
    if (result) {
      results.push({ ...test, ...result });
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('SUMMARY');
  console.log('=' .repeat(50));
  
  const shouldSkip = results.filter(r => r.description.includes('should skip'));
  const needsRetrieval = results.filter(r => r.description.includes('needs retrieval'));
  
  const skipCorrect = shouldSkip.filter(r => !r.hasRetrieval).length;
  const retrievalCorrect = needsRetrieval.filter(r => r.hasRetrieval).length;
  
  console.log(`\nShould skip retrieval: ${skipCorrect}/${shouldSkip.length} correct`);
  console.log(`Needs retrieval: ${retrievalCorrect}/${needsRetrieval.length} correct`);
  
  const avgWithRetrieval = results.filter(r => r.hasRetrieval)
    .reduce((sum, r) => sum + r.responseTime, 0) / results.filter(r => r.hasRetrieval).length || 0;
  const avgWithoutRetrieval = results.filter(r => !r.hasRetrieval)
    .reduce((sum, r) => sum + r.responseTime, 0) / results.filter(r => !r.hasRetrieval).length || 0;
  
  console.log(`\nAverage time WITH retrieval: ${Math.round(avgWithRetrieval)}ms`);
  console.log(`Average time WITHOUT retrieval: ${Math.round(avgWithoutRetrieval)}ms`);
  console.log(`Speed improvement: ${Math.round((1 - avgWithoutRetrieval/avgWithRetrieval) * 100)}%`);
  
  console.log('\n✨ Check server logs for [Retrieval] lines showing when it\'s skipped');
}

runTests().catch(console.error);