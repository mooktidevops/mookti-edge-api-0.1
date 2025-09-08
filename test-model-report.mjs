#!/usr/bin/env node

/**
 * Comprehensive Model Usage Report
 * Shows exactly which models are selected for different operations
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3005';

// Model pricing (per million tokens)
const MODEL_COSTS = {
  'gemini-2.5-flash-lite': { input: 0.02, output: 0.08 },
  'gemini-2.5-flash': { input: 0.075, output: 0.30 },
  'o4-mini': { input: 0.60, output: 2.40 },
  'gemini-2.5-pro': { input: 1.25, output: 5.00 },
  'claude-opus-4-20250514': { input: 15.00, output: 75.00 }
};

async function analyzeModelUsage(description, message, context = {}) {
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
          sessionId: 'model-analysis-' + Date.now(),
          ...context
        }
      })
    });
    
    const totalTime = Date.now() - startTime;
    
    if (response.ok) {
      const result = await response.json();
      
      // Estimate tokens (rough approximation)
      const inputTokens = message.length * 0.75; // rough estimate
      const outputTokens = (result.response?.length || 0) * 0.75;
      
      return {
        description,
        message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        totalTime,
        toolsUsed: result.toolsUsed || [],
        responseLength: result.response?.length || 0,
        estimatedTokens: {
          input: Math.round(inputTokens),
          output: Math.round(outputTokens)
        }
      };
    }
    
    return {
      description,
      message: message.substring(0, 50),
      error: `HTTP ${response.status}`,
      totalTime
    };
  } catch (error) {
    return {
      description,
      message: message.substring(0, 50),
      error: error.message
    };
  }
}

async function runModelReport() {
  console.log('=' .repeat(80));
  console.log('COMPREHENSIVE MODEL USAGE REPORT');
  console.log('=' .repeat(80));
  console.log();
  console.log('This report shows ACTUAL model selection for different query types.');
  console.log('Check server logs for detailed model selection reasoning.');
  console.log();
  
  const testCases = [
    // Tier 1 - Simple/Fast
    {
      category: "Tier 1 - Simple/Fast",
      tests: [
        { description: "Basic arithmetic", message: "What is 2+2?" },
        { description: "Simple greeting", message: "Thanks" },
        { description: "Yes/no question", message: "Is water H2O?" }
      ]
    },
    
    // Tier 2 - Balanced
    {
      category: "Tier 2 - Balanced",
      tests: [
        { description: "Conceptual explanation", message: "What is photosynthesis?" },
        { description: "Learning question", message: "How does DNA replication work?" },
        { description: "Study guidance", message: "Help me understand the water cycle" }
      ]
    },
    
    // Tier 3 - Complex
    {
      category: "Tier 3 - Complex",
      tests: [
        { description: "Complex reasoning", message: "Explain step by step how to solve differential equations" },
        { description: "Diagnostic request", message: "I'm struggling with calculus derivatives, help me identify my weaknesses" },
        { description: "Multi-step problem", message: "Walk me through solving this physics problem about projectile motion with air resistance" }
      ]
    },
    
    // Context-dependent
    {
      category: "Context-dependent",
      tests: [
        { 
          description: "With prior context", 
          message: "Tell me more about that",
          context: {
            priorTurns: [
              { role: 'user', content: 'What is quantum mechanics?' },
              { role: 'assistant', content: 'Quantum mechanics is a fundamental theory...' }
            ]
          }
        },
        {
          description: "Long conversation",
          message: "Can you summarize what we've discussed?",
          context: {
            priorTurns: Array(10).fill(null).map((_, i) => ({
              role: i % 2 === 0 ? 'user' : 'assistant',
              content: `Turn ${i + 1}: Lorem ipsum dolor sit amet...`
            }))
          }
        }
      ]
    }
  ];
  
  const results = [];
  
  for (const category of testCases) {
    console.log('\n' + '=' .repeat(60));
    console.log(category.category);
    console.log('=' .repeat(60));
    
    for (const test of category.tests) {
      console.log(`\nTesting: ${test.description}`);
      console.log(`Query: "${test.message}"`);
      
      const result = await analyzeModelUsage(
        test.description,
        test.message,
        test.context
      );
      
      results.push({ ...result, category: category.category });
      
      if (result.error) {
        console.log(`❌ Error: ${result.error}`);
      } else {
        console.log(`✅ Response time: ${result.totalTime}ms`);
        console.log(`   Tools: ${result.toolsUsed.join(' → ')}`);
        console.log(`   Response: ${result.responseLength} chars`);
        console.log(`   Est. tokens: ${result.estimatedTokens.input} in / ${result.estimatedTokens.output} out`);
      }
      
      // Brief pause to check server logs
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Generate summary report
  console.log('\n' + '=' .repeat(80));
  console.log('SUMMARY ANALYSIS');
  console.log('=' .repeat(80));
  
  // Group by response time to infer model tiers
  const timeRanges = {
    'Tier 1 (< 3s)': results.filter(r => r.totalTime < 3000),
    'Tier 2 (3-8s)': results.filter(r => r.totalTime >= 3000 && r.totalTime < 8000),
    'Tier 3 (8-15s)': results.filter(r => r.totalTime >= 8000 && r.totalTime < 15000),
    'Tier 4 (> 15s)': results.filter(r => r.totalTime >= 15000)
  };
  
  console.log('\nResponse Time Distribution (inferred model tiers):');
  for (const [range, items] of Object.entries(timeRanges)) {
    if (items.length > 0) {
      console.log(`\n${range}: ${items.length} requests`);
      items.forEach(item => {
        console.log(`  - ${item.description}: ${item.totalTime}ms`);
      });
    }
  }
  
  // Tool usage analysis
  console.log('\nTool Usage Patterns:');
  const toolUsage = {};
  results.forEach(r => {
    r.toolsUsed?.forEach(tool => {
      toolUsage[tool] = (toolUsage[tool] || 0) + 1;
    });
  });
  
  Object.entries(toolUsage)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tool, count]) => {
      console.log(`  ${tool}: ${count} times`);
    });
  
  // Performance statistics
  const validResults = results.filter(r => !r.error);
  if (validResults.length > 0) {
    const avgTime = validResults.reduce((sum, r) => sum + r.totalTime, 0) / validResults.length;
    const minTime = Math.min(...validResults.map(r => r.totalTime));
    const maxTime = Math.max(...validResults.map(r => r.totalTime));
    
    console.log('\nPerformance Statistics:');
    console.log(`  Average response time: ${Math.round(avgTime)}ms`);
    console.log(`  Fastest response: ${minTime}ms`);
    console.log(`  Slowest response: ${maxTime}ms`);
    console.log(`  Meeting <2s target: ${validResults.filter(r => r.totalTime < 2000).length}/${validResults.length}`);
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('MODEL SELECTION INSIGHTS');
  console.log('=' .repeat(80));
  console.log();
  console.log('Based on response times, the following models appear to be in use:');
  console.log('  • < 3s: Likely Tier 1 (gemini-2.5-flash-lite)');
  console.log('  • 3-8s: Likely Tier 2 (gemini-2.5-flash)');
  console.log('  • 8-15s: Likely Tier 3 (o4-mini)');
  console.log('  • > 15s: Likely Tier 4 (gemini-2.5-pro or claude-opus-4)');
  console.log();
  console.log('⚠️  IMPORTANT: Check server logs for exact model selection details.');
  console.log('    Look for lines starting with [ModelSelection] to see:');
  console.log('    - Input context and tool selection');
  console.log('    - Tier determination and adjustments');
  console.log('    - Final model selection and cost profile');
  console.log();
  console.log('To see live model selection, run: tail -f [server-log-file] | grep ModelSelection');
}

runModelReport().catch(console.error);