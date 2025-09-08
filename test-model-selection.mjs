#!/usr/bin/env node

/**
 * Test what models are being selected for different queries
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3005';

async function testModelSelection() {
  const queries = [
    { message: "What is 2+2?", expected: "Tier 1 or 2" },
    { message: "Explain photosynthesis", expected: "Tier 2" },
    { message: "Help me understand quantum mechanics through questioning", expected: "Tier 2" },
    { message: "I'm struggling with calculus and need help preparing for my exam", expected: "Tier 3" },
  ];
  
  console.log('Testing Model Selection\n');
  console.log('Note: Check server logs for model selection details\n');
  
  for (const query of queries) {
    console.log(`Query: "${query.message}"`);
    console.log(`Expected tier: ${query.expected}`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${API_URL}/api/ellen/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-key'
        },
        body: JSON.stringify({
          message: query.message,
          context: {
            userId: 'test-user',
            sessionId: 'model-test-' + Date.now()
          }
        })
      });
      
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Response in ${latency}ms`);
        console.log(`Tools: ${result.toolsUsed?.join(', ')}`);
        
        // Estimate tier based on latency
        let estimatedTier;
        if (latency < 3000) estimatedTier = "Tier 1 (Fast)";
        else if (latency < 8000) estimatedTier = "Tier 2 (Balanced)";
        else if (latency < 15000) estimatedTier = "Tier 3 (Complex)";
        else estimatedTier = "Tier 4 (Frontier)";
        
        console.log(`Estimated tier (by latency): ${estimatedTier}`);
      } else {
        console.log(`❌ Failed: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('---\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\nCheck server logs for actual model selection details.');
}

testModelSelection().catch(console.error);
