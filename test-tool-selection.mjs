#!/usr/bin/env node

/**
 * Test improved tool selection logic
 * Verifies that Socratic is the default and complex queries use AI selection
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3005';

console.log('🧪 Testing Improved Tool Selection\n');
console.log('='.repeat(60) + '\n');

// Test queries that should all default to Socratic
const socraticQueries = [
  "What is photosynthesis?",
  "Explain quantum mechanics",
  "I don't understand calculus",
  "How does DNA replication work?",
  "Why does the moon have phases?",
  "Can you explain thermodynamics?",
  "What's the difference between mitosis and meiosis?",
  "How do computers work?",
  "Tell me about the French Revolution",
  "What causes earthquakes?"
];

// Test queries that should trigger specific tools
const specificToolQueries = [
  { query: "Quiz me on biology", expectedTool: "retrieval" },
  { query: "Help me write an essay about climate change", expectedTool: "writing_coach" },
  { query: "Make flashcards for Spanish vocabulary", expectedTool: "flashcard_generator" },
  { query: "Help me plan my study schedule for finals", expectedTool: "plan_manager" },
  { query: "How can I apply physics to real world problems?", expectedTool: "extension_tool" },
  { query: "Help me reflect on my learning progress", expectedTool: "reflection_tool" }
];

// Test complex queries that should use AI selection (Tier 3)
const complexQueries = [
  "I'm struggling with calculus and need to prepare for my exam next week",
  "Help me understand photosynthesis and then create practice questions",
  "I need to write a paper about climate change and also study for my chemistry test",
  "Where should I start with learning programming?",
  "How can I get better at math?",
  "I'm having trouble with everything in physics class"
];

async function testQuery(message, expectedBehavior) {
  console.log(`Query: "${message}"`);
  console.log(`Expected: ${expectedBehavior}`);
  
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
          sessionId: `test-selection-${Date.now()}`
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    const toolsUsed = result.toolsUsed || [];
    
    console.log(`Tools used: ${toolsUsed.join(', ')}`);
    
    // Check if the expected behavior matches
    if (expectedBehavior === 'socratic_tool') {
      const success = toolsUsed.includes('socratic_tool');
      console.log(success ? '✅ Correct (Socratic default)' : '❌ Wrong tool selected');
      return success;
    } else if (expectedBehavior.startsWith('multiple:')) {
      const success = toolsUsed.length > 1;
      console.log(success ? '✅ Correct (Multiple tools)' : '❌ Should have selected multiple tools');
      return success;
    } else {
      const success = toolsUsed.includes(expectedBehavior);
      console.log(success ? '✅ Correct tool selected' : `❌ Expected ${expectedBehavior}`);
      return success;
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  } finally {
    console.log('');
  }
}

async function runTests() {
  let totalTests = 0;
  let passedTests = 0;
  
  // Test 1: Socratic defaults
  console.log('### Test 1: Socratic Method Defaults\n');
  for (const query of socraticQueries) {
    totalTests++;
    if (await testQuery(query, 'socratic_tool')) {
      passedTests++;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Test 2: Specific tool triggers
  console.log('\n### Test 2: Specific Tool Selection\n');
  for (const { query, expectedTool } of specificToolQueries) {
    totalTests++;
    if (await testQuery(query, expectedTool)) {
      passedTests++;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Test 3: Complex queries (should use AI selection)
  console.log('\n### Test 3: Complex Query Handling\n');
  for (const query of complexQueries) {
    totalTests++;
    // For complex queries, we just check that they're handled
    // They might select single or multiple tools via AI
    if (await testQuery(query, 'multiple:ai-selected')) {
      passedTests++;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('='.repeat(60));
  console.log('\n📊 Test Summary\n');
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n✅ All tests passed! Tool selection is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Review the tool selection logic.');
  }
}

// Run the tests
console.log('Starting tool selection tests...\n');
runTests().catch(console.error);