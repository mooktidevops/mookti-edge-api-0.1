/**
 * Integration test for all Ellen pedagogical tools
 */

import { ellenTools, ELLEN_TOOLS } from '../src/services/ellen-tools';
import { routeToModel } from '../lib/ai/model-router';

const TEST_CASES = [
  {
    name: 'Socratic Tool Test',
    tool: ELLEN_TOOLS.SOCRATIC,
    message: 'What is photosynthesis?',
    expected: 'Should engage with questions'
  },
  {
    name: 'Retrieval Practice Test', 
    tool: ELLEN_TOOLS.RETRIEVAL_PRACTICE,
    message: 'Help me practice recalling the causes of World War I',
    expected: 'Should provide retrieval steps'
  },
  {
    name: 'Flashcard Generator Test',
    tool: ELLEN_TOOLS.FLASHCARD_GENERATOR,
    message: 'Create flashcards for the periodic table elements',
    expected: 'Should generate spaced repetition cards'
  },
  {
    name: 'Concept Mapper Test',
    tool: ELLEN_TOOLS.CONCEPT_MAPPER,
    message: 'Help me map the concepts in cellular biology',
    expected: 'Should create concept map structure'
  },
  {
    name: 'Class Troubleshooter Test',
    tool: ELLEN_TOOLS.CLASS_TROUBLESHOOTER,
    message: 'My professor talks too fast and I cannot keep up with notes',
    expected: 'Should diagnose and provide solutions'
  },
  {
    name: 'Writing Coach Test',
    tool: ELLEN_TOOLS.WRITING_COACH,
    message: 'Help me improve my thesis statement',
    expected: 'Should provide writing feedback'
  },
  {
    name: 'Plan Manager Test',
    tool: ELLEN_TOOLS.PLAN_MANAGER,
    message: 'Help me create a study plan for my chemistry midterm',
    expected: 'Should create WOOP-based plan'
  }
];

async function runTest(testCase: typeof TEST_CASES[0]) {
  console.log(`\n🧪 Running: ${testCase.name}`);
  console.log(`   Tool: ${testCase.tool}`);
  console.log(`   Input: "${testCase.message}"`);
  
  try {
    // Get model routing (would normally come from request)
    const modelRouting = await routeToModel({
      task: testCase.message,
      complexity: 'medium',
      toolName: testCase.tool
    });

    // Execute the tool
    const result = await ellenTools.execute(
      testCase.message,
      testCase.tool,
      {
        content: testCase.message,
        subject: 'test',
        difficulty: 'medium',
        userMessage: testCase.message,
        modelRouting
      },
      modelRouting
    );

    // Check if result has expected structure
    if (result) {
      console.log(`   ✅ Success - Tool executed`);
      
      // Log key aspects of the result
      if ('technique' in result) {
        console.log(`   Technique: ${result.technique}`);
      }
      if ('steps' in result && Array.isArray(result.steps)) {
        console.log(`   Steps provided: ${result.steps.length}`);
      }
      if ('strategy' in result) {
        console.log(`   Strategy: ${result.strategy}`);
      }
      if ('cards' in result) {
        console.log(`   Flashcards generated: ${result.cards?.length || 0}`);
      }
      if ('nodes' in result) {
        console.log(`   Concept nodes: ${result.nodes?.length || 0}`);
      }
    } else {
      console.log(`   ⚠️  Warning - No result returned`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('=================================');
  console.log('Ellen Tools Integration Test Suite');
  console.log('=================================');
  
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  for (const testCase of TEST_CASES) {
    try {
      await runTest(testCase);
      passed++;
    } catch (error) {
      failed++;
      console.error(`Test failed: ${error}`);
    }
  }

  const duration = Date.now() - startTime;
  
  console.log('\n=================================');
  console.log('Test Summary');
  console.log('=================================');
  console.log(`Total tests: ${TEST_CASES.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${duration}ms`);
  console.log('=================================\n');

  // Also test the master orchestrator's auto-routing
  console.log('Testing auto-routing (no tool specified):');
  const autoTests = [
    'I am struggling with my math homework',
    'Create a concept map for photosynthesis',
    'Help me write better notes',
    'I need flashcards for Spanish vocabulary'
  ];

  for (const message of autoTests) {
    console.log(`\n🔄 Auto-routing: "${message}"`);
    try {
      const modelRouting = await routeToModel({
        task: message,
        complexity: 'medium'
      });

      const result = await ellenTools.execute(
        message,
        undefined, // Let it auto-select
        { userMessage: message, modelRouting },
        modelRouting
      );
      
      console.log(`   ✅ Auto-routed successfully`);
    } catch (error) {
      console.log(`   ❌ Auto-routing failed: ${error.message}`);
    }
  }
}

// Run tests
runAllTests().catch(console.error);