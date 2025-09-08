#!/usr/bin/env node

/**
 * Integration test for Ellen API with new model tiers
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3005';

console.log('🚀 Ellen Integration Test with New Model Tiers\n');
console.log('='.repeat(60) + '\n');

// Test queries for each tier
const testQueries = [
  {
    name: 'Tier 1: Simple Reflection',
    message: 'How am I feeling about my study progress?',
    toolOverride: 'reflection',
    expectedTier: 1,
    expectedModel: 'gemini-2.5-flash-lite'
  },
  {
    name: 'Tier 2: Socratic Dialogue',
    message: 'Help me understand photosynthesis through questioning',
    toolOverride: 'socratic',
    expectedTier: 2,
    expectedModel: 'gpt-5-mini'
  },
  {
    name: 'Tier 3: Learning Diagnostic',
    message: 'Analyze my learning patterns and suggest improvements',
    toolOverride: 'learning_diagnostic',
    expectedTier: 3,
    expectedModel: 'o4-mini'
  },
  {
    name: 'Tier 4: Frontier (User Request)',
    message: 'Create a comprehensive curriculum for quantum computing',
    modelPreference: 'auto',
    expectedTier: 4,
    expectedModel: 'gemini-2.5-pro'
  }
];

async function testQuery(query, index) {
  console.log(`Test ${index + 1}: ${query.name}`);
  console.log(`Message: "${query.message}"`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_URL}/api/ellen/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MOOKTI_API_KEY || 'test-key'}`
      },
      body: JSON.stringify({
        message: query.message,
        toolOverride: query.toolOverride,
        modelPreference: query.modelPreference,
        context: {
          userId: 'test-user',
          sessionId: `test-tier-${query.expectedTier}`
        }
      })
    });

    const endTime = Date.now();
    const latency = endTime - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    console.log(`✅ Response received in ${latency}ms`);
    
    if (result.toolsUsed) {
      console.log(`Tools used: ${result.toolsUsed.join(', ')}`);
    }
    
    // Show first 200 chars of response
    if (result.response) {
      const preview = result.response.substring(0, 200);
      console.log(`Response preview: "${preview}..."`);
    }
    
    // Calculate approximate cost
    const tokenEstimate = (query.message.length + (result.response?.length || 0)) / 4;
    const costEstimates = {
      1: 0.0001,
      2: 0.0025,
      3: 0.003,
      4: 0.02
    };
    const estimatedCost = (tokenEstimate / 1000) * costEstimates[query.expectedTier];
    console.log(`Estimated cost: $${estimatedCost.toFixed(6)}`);
    
    console.log('');
    return { success: true, latency, cost: estimatedCost };
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log('');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  let totalCost = 0;
  let totalLatency = 0;
  let successCount = 0;
  
  for (let i = 0; i < testQueries.length; i++) {
    const result = await testQuery(testQueries[i], i);
    
    if (result.success) {
      successCount++;
      totalLatency += result.latency;
      totalCost += result.cost;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('='.repeat(60));
  console.log('📊 Summary\n');
  console.log(`Tests passed: ${successCount}/${testQueries.length}`);
  
  if (successCount > 0) {
    console.log(`Average latency: ${Math.round(totalLatency / successCount)}ms`);
    console.log(`Total estimated cost: $${totalCost.toFixed(6)}`);
    console.log(`Average cost per request: $${(totalCost / successCount).toFixed(6)}`);
    
    // Compare to old system
    const oldCostPerRequest = 0.0014;
    const newCostPerRequest = totalCost / successCount;
    const savings = ((oldCostPerRequest - newCostPerRequest) / oldCostPerRequest) * 100;
    
    console.log(`\nCost Comparison:`);
    console.log(`  Old system: $${oldCostPerRequest.toFixed(6)}/request`);
    console.log(`  New system: $${newCostPerRequest.toFixed(6)}/request`);
    console.log(`  Savings: ${savings.toFixed(1)}%`);
  }
}

// Run the tests
console.log('Starting integration tests...\n');
runTests().catch(console.error);