#!/usr/bin/env node

/**
 * Test frustration detection and tool switching
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3005';

console.log('😤 Testing Frustration Detection & Tool Switching\n');
console.log('='.repeat(60) + '\n');

// Test scenarios simulating real student frustration
const frustrationScenarios = [
  {
    name: "Subtle frustration",
    messages: [
      "What is photosynthesis?",
      "hmm okay",
      "still don't get it"
    ],
    expectedBehavior: "Should detect confusion and offer alternatives"
  },
  {
    name: "Direct frustration",
    messages: [
      "Explain calculus",
      "This isn't helping",
      "Can you just tell me the answer?"
    ],
    expectedBehavior: "Should switch from Socratic to direct explanation"
  },
  {
    name: "Disengagement pattern",
    messages: [
      "How does DNA replication work?",
      "ok",
      "...",
      "nevermind"
    ],
    expectedBehavior: "Should detect disengagement and re-engage"
  },
  {
    name: "Polite frustration",
    messages: [
      "Can you help me understand quantum mechanics?",
      "I appreciate your questions, but I think I need a different approach",
      "Could we try something else?"
    ],
    expectedBehavior: "Should recognize polite request for change"
  },
  {
    name: "Learning style mismatch",
    messages: [
      "How do computers work?",
      "I'm more of a visual learner",
      "Do you have any diagrams?"
    ],
    expectedBehavior: "Should switch to visual tools"
  },
  {
    name: "Overwhelmed student",
    messages: [
      "Help me study for my physics exam",
      "There's so much to cover",
      "I don't know where to start"
    ],
    expectedBehavior: "Should provide structure and planning"
  }
];

async function simulateConversation(scenario) {
  console.log(`### Scenario: ${scenario.name}\n`);
  console.log(`Expected: ${scenario.expectedBehavior}\n`);
  
  const sessionId = `test-frustration-${Date.now()}`;
  const priorTurns = [];
  let frustrationDetected = false;
  let toolSwitchOccurred = false;
  
  for (let i = 0; i < scenario.messages.length; i++) {
    const message = scenario.messages[i];
    console.log(`Student: "${message}"`);
    
    try {
      const response = await fetch(`${API_URL}/api/ellen/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MOOKTI_API_KEY || 'test-key'}`
        },
        body: JSON.stringify({
          message,
          context: {
            userId: 'test-user',
            sessionId,
            priorTurns
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      // Check for meta-tool usage
      const toolsUsed = result.toolsUsed || [];
      if (toolsUsed.some(t => t.includes('frustration') || t.includes('switch') || t.includes('clarif'))) {
        frustrationDetected = true;
        console.log(`Ellen: [META-TOOL: ${toolsUsed.join(', ')}]`);
      } else {
        console.log(`Ellen: [Tool: ${toolsUsed.join(', ')}]`);
      }
      
      // Show first 150 chars of response
      const preview = result.response.substring(0, 150);
      console.log(`Response: "${preview}..."\n`);
      
      // Check if tool changed
      if (i > 0 && toolsUsed[0] !== priorTurns[priorTurns.length - 1]?.tool) {
        toolSwitchOccurred = true;
      }
      
      // Add to conversation history
      priorTurns.push({ role: 'user', content: message });
      priorTurns.push({ 
        role: 'assistant', 
        content: result.response,
        tool: toolsUsed[0]
      });
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
      return { success: false, error: error.message };
    }
    
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Evaluate success
  const success = frustrationDetected || toolSwitchOccurred;
  console.log('\nResults:');
  console.log(`- Frustration detected: ${frustrationDetected ? '✅' : '❌'}`);
  console.log(`- Tool switch occurred: ${toolSwitchOccurred ? '✅' : '❌'}`);
  console.log(`Overall: ${success ? '✅ PASS' : '❌ FAIL'}\n`);
  
  return { success, frustrationDetected, toolSwitchOccurred };
}

async function runTests() {
  const results = [];
  
  for (const scenario of frustrationScenarios) {
    const result = await simulateConversation(scenario);
    results.push({
      scenario: scenario.name,
      ...result
    });
    
    console.log('='.repeat(60) + '\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('📊 Test Summary\n');
  console.log('Scenario Results:');
  results.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    console.log(`${icon} ${r.scenario}`);
    if (r.success) {
      console.log(`   - Frustration: ${r.frustrationDetected ? 'Detected' : 'N/A'}`);
      console.log(`   - Tool Switch: ${r.toolSwitchOccurred ? 'Yes' : 'No'}`);
    }
  });
  
  const successRate = (results.filter(r => r.success).length / results.length) * 100;
  console.log(`\nSuccess Rate: ${successRate.toFixed(0)}%`);
  
  if (successRate === 100) {
    console.log('\n🎉 All frustration scenarios handled correctly!');
  } else if (successRate >= 70) {
    console.log('\n👍 Good frustration handling, some improvements needed.');
  } else {
    console.log('\n⚠️ Frustration handling needs significant improvement.');
  }
}

// Run the tests
console.log('Starting frustration handling tests...\n');
runTests().catch(console.error);