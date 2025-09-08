#!/usr/bin/env node

/**
 * Test to see actual models being selected
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3006';

async function testModelSelection(message) {
  console.log(`\nTesting: "${message}"`);
  const start = Date.now();
  
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
          sessionId: 'test-' + Date.now()
        }
      })
    });
    
    const time = Date.now() - start;
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ ${time}ms - Tools: ${result.toolsUsed?.join(', ')}`);
      
      // Infer model from response time
      if (time < 2000) console.log('   → Likely Tier 1 (gemini-2.5-flash-lite)');
      else if (time < 5000) console.log('   → Likely Tier 2 (gemini-2.5-flash)');
      else if (time < 10000) console.log('   → Likely Tier 3 (o4-mini)');
      else console.log('   → Likely Tier 4 (gemini-2.5-pro)');
      
      return time;
    } else {
      console.log(`❌ Failed: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

async function run() {
  console.log('MODEL SELECTION ACTUAL TEST');
  console.log('=' .repeat(50));
  console.log('CHECK SERVER LOGS FOR [ModelSelection] LINES\n');
  
  // Test different complexity levels
  const times = [];
  
  times.push(await testModelSelection("What is 2+2?"));
  await new Promise(r => setTimeout(r, 2000));
  
  times.push(await testModelSelection("What is photosynthesis?"));
  await new Promise(r => setTimeout(r, 2000));
  
  times.push(await testModelSelection("Explain step by step how to solve differential equations"));
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('ACTUAL RESULTS:');
  const validTimes = times.filter(t => t !== null);
  if (validTimes.length > 0) {
    console.log(`Average: ${Math.round(validTimes.reduce((a,b) => a+b, 0) / validTimes.length)}ms`);
    console.log(`Min: ${Math.min(...validTimes)}ms`);
    console.log(`Max: ${Math.max(...validTimes)}ms`);
  }
  
  console.log('\n⚠️  CHECK SERVER TERMINAL FOR [ModelSelection] LOG LINES');
  console.log('These show the ACTUAL models being selected, not guesses.');
}

run().catch(console.error);