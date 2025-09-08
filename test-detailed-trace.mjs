#!/usr/bin/env node

/**
 * Detailed trace of Ellen API operations with timing breakdown
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3005';

async function traceRequest(description, message, context = {}) {
  console.log('\n' + '='.repeat(60));
  console.log(`TEST: ${description}`);
  console.log(`INPUT: "${message}"`);
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  const checkpoints = [];
  
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
          sessionId: 'trace-' + Date.now(),
          ...context
        }
      })
    });
    
    const totalTime = Date.now() - startTime;
    
    if (response.ok) {
      const result = await response.json();
      
      console.log('\nRESULT:');
      console.log(`- Total time: ${totalTime}ms`);
      console.log(`- Tools used: ${result.toolsUsed?.join(' → ')}`);
      console.log(`- Response length: ${result.response?.length} chars`);
      console.log(`- Response preview: "${result.response?.substring(0, 100)}..."`);
      
      return { success: true, totalTime, tools: result.toolsUsed };
    } else {
      console.log(`\nERROR: HTTP ${response.status} after ${totalTime}ms`);
      return { success: false, totalTime };
    }
  } catch (error) {
    console.log(`\nERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runDetailedTrace() {
  console.log('DETAILED ELLEN API TRACE');
  console.log('Showing exactly what happens for each query type\n');
  
  const tests = [
    {
      description: "Simple factual question",
      message: "What is 2+2?"
    },
    {
      description: "Conceptual learning question", 
      message: "What is photosynthesis?"
    },
    {
      description: "Meta conversation",
      message: "Thanks"
    },
    {
      description: "Complex learning request",
      message: "I'm struggling with calculus derivatives"
    },
    {
      description: "Question with prior context",
      message: "Tell me more",
      context: {
        priorTurns: [
          { role: 'user', content: 'What is DNA?' },
          { role: 'assistant', content: 'DNA is the hereditary material...' }
        ]
      }
    },
    {
      description: "Repeated query (cache test)",
      message: "What is 2+2?"
    }
  ];
  
  const results = [];
  
  console.log('Note: Check server logs (printed below) for detailed operation breakdown\n');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  for (const test of tests) {
    const result = await traceRequest(
      test.description, 
      test.message, 
      test.context || {}
    );
    results.push({ ...test, ...result });
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY OF ALL OPERATIONS');
  console.log('='.repeat(60));
  
  console.log('\nTiming Breakdown:');
  for (const r of results) {
    if (r.success) {
      console.log(`- ${r.description}: ${r.totalTime}ms`);
      console.log(`  Tools: ${r.tools?.join(' → ')}`);
    }
  }
  
  const avgTime = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.totalTime, 0) / results.filter(r => r.success).length;
  
  console.log(`\nAverage response time: ${Math.round(avgTime)}ms`);
  
  // Operation breakdown
  console.log('\nOperation Types Observed:');
  const toolCounts = {};
  results.forEach(r => {
    r.tools?.forEach(t => {
      toolCounts[t] = (toolCounts[t] || 0) + 1;
    });
  });
  
  Object.entries(toolCounts).forEach(([tool, count]) => {
    console.log(`- ${tool}: ${count} times`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('SERVER LOG ANALYSIS (from background process)');
  console.log('='.repeat(60));
  console.log('Check the server output for lines showing:');
  console.log('- [Optimizer] - What optimizations were applied');
  console.log('- [Context] - Whether context rewrite happened');
  console.log('- [Retrieval] - Whether vector search happened');  
  console.log('- [Model] - Which AI model was used');
  console.log('- [Performance] - Total time for request');
  console.log('\nThis shows the ACTUAL operations and models used.');
}

runDetailedTrace().catch(console.error);