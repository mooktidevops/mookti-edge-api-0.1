#!/usr/bin/env node

/**
 * Performance testing for optimized model selection
 * Compares latency, cost, and quality across tiers
 */

import fetch from 'node-fetch';

const API_URL = process.env.EDGE_API_URL || 'http://localhost:3001';

console.log('🚀 Model Performance Testing\n');
console.log('Testing against:', API_URL);
console.log('=' .repeat(60) + '\n');

// Test queries for different complexity levels
const testQueries = [
  {
    tier: 1,
    tool: 'reflection_tool',
    message: 'How do I feel about my progress today?',
    expectedLatency: 500
  },
  {
    tier: 2,
    tool: 'socratic_tool',
    message: 'Help me understand photosynthesis through questions',
    expectedLatency: 1500
  },
  {
    tier: 3,
    tool: 'learning_diagnostic',
    message: 'Analyze my learning patterns and suggest improvements',
    expectedLatency: 2000
  },
  {
    tier: 4,
    tool: null, // Frontier selection
    message: 'Create a comprehensive curriculum for quantum computing',
    modelPreference: 'auto',
    expectedLatency: 3000
  }
];

// Performance metrics storage
const metrics = {
  byTier: {},
  byModel: {},
  overall: {
    totalRequests: 0,
    totalTime: 0,
    totalCost: 0
  }
};

async function testQuery(query) {
  console.log(`\n📝 Testing Tier ${query.tier}: ${query.tool || 'Frontier'}`);
  console.log(`   Query: "${query.message}"`);
  
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
        toolOverride: query.tool,
        modelPreference: query.modelPreference,
        context: {
          userId: 'test-user',
          sessionId: `test-tier-${query.tier}`
        }
      })
    });

    const endTime = Date.now();
    const latency = endTime - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Record metrics
    if (!metrics.byTier[query.tier]) {
      metrics.byTier[query.tier] = {
        requests: 0,
        totalTime: 0,
        avgLatency: 0,
        minLatency: Infinity,
        maxLatency: 0
      };
    }
    
    const tierMetrics = metrics.byTier[query.tier];
    tierMetrics.requests++;
    tierMetrics.totalTime += latency;
    tierMetrics.avgLatency = tierMetrics.totalTime / tierMetrics.requests;
    tierMetrics.minLatency = Math.min(tierMetrics.minLatency, latency);
    tierMetrics.maxLatency = Math.max(tierMetrics.maxLatency, latency);
    
    metrics.overall.totalRequests++;
    metrics.overall.totalTime += latency;
    
    // Display results
    console.log(`   ✓ Response received in ${latency}ms`);
    console.log(`   Expected: <${query.expectedLatency}ms`);
    console.log(`   Status: ${latency <= query.expectedLatency ? '✅ PASS' : '⚠️  SLOW'}`);
    
    if (result.toolsUsed) {
      console.log(`   Tools used: ${result.toolsUsed.join(', ')}`);
    }
    
    // Estimate cost (rough calculation)
    const inputTokens = query.message.length / 4; // Rough token estimate
    const outputTokens = result.response?.length / 4 || 100;
    const costPerMillion = [0.1, 2.5, 3.0, 20.0][query.tier - 1];
    const estimatedCost = ((inputTokens + outputTokens) / 1000000) * costPerMillion;
    
    console.log(`   Estimated cost: $${estimatedCost.toFixed(6)}`);
    metrics.overall.totalCost += estimatedCost;
    
    return { success: true, latency, cost: estimatedCost };
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runPerformanceTests() {
  console.log('Starting performance tests...\n');
  
  // Test each query 3 times for average
  for (const query of testQueries) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TIER ${query.tier} TESTING (3 iterations)`);
    console.log(`${'='.repeat(60)}`);
    
    for (let i = 0; i < 3; i++) {
      console.log(`\nIteration ${i + 1}/3:`);
      await testQuery(query);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Display summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 PERFORMANCE SUMMARY');
  console.log(`${'='.repeat(60)}\n`);
  
  // Tier-by-tier summary
  for (const [tier, data] of Object.entries(metrics.byTier)) {
    console.log(`Tier ${tier}:`);
    console.log(`  Requests: ${data.requests}`);
    console.log(`  Avg Latency: ${Math.round(data.avgLatency)}ms`);
    console.log(`  Min Latency: ${Math.round(data.minLatency)}ms`);
    console.log(`  Max Latency: ${Math.round(data.maxLatency)}ms`);
    console.log('');
  }
  
  // Overall summary
  console.log('Overall:');
  console.log(`  Total Requests: ${metrics.overall.totalRequests}`);
  console.log(`  Total Time: ${Math.round(metrics.overall.totalTime)}ms`);
  console.log(`  Avg Time/Request: ${Math.round(metrics.overall.totalTime / metrics.overall.totalRequests)}ms`);
  console.log(`  Total Estimated Cost: $${metrics.overall.totalCost.toFixed(4)}`);
  console.log(`  Avg Cost/Request: $${(metrics.overall.totalCost / metrics.overall.totalRequests).toFixed(6)}`);
  
  // Cost comparison
  console.log(`\n${'='.repeat(60)}`);
  console.log('💰 COST COMPARISON');
  console.log(`${'='.repeat(60)}\n`);
  
  const oldCostPerRequest = 0.0014; // From current system
  const newCostPerRequest = metrics.overall.totalCost / metrics.overall.totalRequests;
  const savings = ((oldCostPerRequest - newCostPerRequest) / oldCostPerRequest) * 100;
  
  console.log(`Old System: $${oldCostPerRequest.toFixed(6)}/request`);
  console.log(`New System: $${newCostPerRequest.toFixed(6)}/request`);
  console.log(`Savings: ${savings.toFixed(1)}%`);
  
  // Monthly projection
  const requestsPerDay = 1000 * 10; // 1000 users, 10 requests each
  const monthlyOld = oldCostPerRequest * requestsPerDay * 30;
  const monthlyNew = newCostPerRequest * requestsPerDay * 30;
  
  console.log(`\nMonthly Projection (10k requests/day):`);
  console.log(`  Old System: $${monthlyOld.toFixed(2)}`);
  console.log(`  New System: $${monthlyNew.toFixed(2)}`);
  console.log(`  Monthly Savings: $${(monthlyOld - monthlyNew).toFixed(2)}`);
}

// Run the tests
runPerformanceTests().catch(console.error);