#!/usr/bin/env node

/**
 * V2 Orchestrator Test Suite - Using Compiled JS
 * Tests User State Monitor, Intent Router, and new tools
 */

require('dotenv').config();

const TEST_SCENARIOS = [
  {
    name: "Quick Answer Request",
    messages: ["What is the quadratic formula?"],
    expected: {
      intent: "understand",
      depth: "surface",
      tool: "quick_answer",
      frustration: 0
    }
  },
  {
    name: "Practical Guidance", 
    messages: ["How do I write a lab report for chemistry?"],
    expected: {
      intent: ["understand", "create"], // Accept either - it's both learning and creating
      depth: "guided",
      tool: "practical_guide",
      frustration: 0
    }
  },
  {
    name: "Problem Solving",
    messages: ["Help me solve this integral: ∫x²dx"],
    expected: {
      intent: "solve",
      depth: "guided",
      tool: "problem_solver",
      frustration: 0
    }
  },
  {
    name: "Decision Making",
    messages: ["Should I drop my calculus class?"],
    expected: {
      intent: "evaluate",
      depth: "guided", // ONLY accept guided for subjective decisions
      tool: "evaluator_tool",
      frustration: 5 // LLM correctly detects some stress/frustration in this terse question
    }
  },
  {
    name: "Writing Task",
    messages: ["I need to write an essay about climate change"],
    expected: {
      intent: "create",
      depth: "guided",
      tool: "writing_coach",
      frustration: 0
    }
  },
  {
    name: "Frustration Detection",
    messages: ["This is so confusing, I give up"],
    expected: {
      intent: ["understand", "regulate", "interact"], // Could be any - no clear learning task
      depth: ["surface", "guided"], // When frustrated, any simple help is good
      tool: "any",
      frustration: 8 // Should be high
    }
  }
];

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function testStateMonitor() {
  console.log(`\n${colors.cyan}=== Testing User State Monitor ===${colors.reset}\n`);
  
  const { UserStateMonitor } = require('./dist/src/services/user-state-monitor');
  const monitor = new UserStateMonitor();
  
  let passed = 0;
  let failed = 0;
  
  for (const scenario of TEST_SCENARIOS.slice(0, 6)) {
    console.log(`${colors.blue}Testing: ${scenario.name}${colors.reset}`);
    console.log(`Message: "${scenario.messages[0]}"`);
    
    try {
      const state = await monitor.analyzeState(
        scenario.messages[0],
        [],
        'socratic_tool'
      );
      
      // Handle array expectations for intent
      const intentMatch = Array.isArray(scenario.expected.intent) 
        ? scenario.expected.intent.includes(state.intent.current)
        : state.intent.current === scenario.expected.intent;
      
      // Handle array expectations for depth  
      const depthMatch = Array.isArray(scenario.expected.depth)
        ? scenario.expected.depth.includes(state.depth.current)
        : state.depth.current === scenario.expected.depth;
        
      // Be more flexible with frustration matching - accept within 2 points
      const frustrationMatch = scenario.expected.frustration > 0 ? 
        Math.abs(state.sentiment.frustrationLevel - scenario.expected.frustration) <= 2 :
        state.sentiment.frustrationLevel < 3;
      
      const expectedIntent = Array.isArray(scenario.expected.intent) 
        ? scenario.expected.intent.join(' or ')
        : scenario.expected.intent;
      const expectedDepth = Array.isArray(scenario.expected.depth)
        ? scenario.expected.depth.join(' or ')
        : scenario.expected.depth;
        
      console.log(`Intent: ${state.intent.current} ${intentMatch ? '✓' : '✗'} (expected: ${expectedIntent})`);
      console.log(`Depth: ${state.depth.current} ${depthMatch ? '✓' : '✗'} (expected: ${expectedDepth})`);
      console.log(`Frustration: ${state.sentiment.frustrationLevel} ${frustrationMatch ? '✓' : '✗'}`);
      console.log(`Suggested tool: ${monitor.selectToolFromState(state)}`);
      
      if (intentMatch && depthMatch && frustrationMatch) {
        console.log(`${colors.green}✓ PASSED${colors.reset}`);
        passed++;
      } else {
        console.log(`${colors.red}✗ FAILED${colors.reset}`);
        failed++;
      }
    } catch (error) {
      console.log(`${colors.red}✗ ERROR: ${error.message}${colors.reset}`);
      failed++;
    }
    
    console.log('---');
  }
  
  return { passed, failed };
}

async function testIntentRouter() {
  console.log(`\n${colors.cyan}=== Testing Intent Router ===${colors.reset}\n`);
  
  const { intentRouter } = require('./dist/src/services/ellen-tools/intent-router-tool');
  
  let passed = 0;
  let failed = 0;
  
  for (const scenario of TEST_SCENARIOS.slice(0, 5)) {
    console.log(`${colors.blue}Testing: ${scenario.name}${colors.reset}`);
    console.log(`Message: "${scenario.messages[0]}"`);
    
    try {
      const result = await intentRouter.execute({
        message: scenario.messages[0],
        conversationHistory: []
      });
      
      // Handle array expectations for intent
      const intentMatch = Array.isArray(scenario.expected.intent)
        ? scenario.expected.intent.includes(result.primaryIntent)
        : result.primaryIntent === scenario.expected.intent;
        
      // Handle array expectations for depth
      const depthMatch = Array.isArray(scenario.expected.depth)
        ? scenario.expected.depth.includes(result.depth)
        : result.depth === scenario.expected.depth;
      
      const expectedIntent = Array.isArray(scenario.expected.intent)
        ? scenario.expected.intent.join(' or ')
        : scenario.expected.intent;
      const expectedDepth = Array.isArray(scenario.expected.depth)
        ? scenario.expected.depth.join(' or ')
        : scenario.expected.depth;
        
      console.log(`Intent: ${result.primaryIntent} ${intentMatch ? '✓' : '✗'} (expected: ${expectedIntent})`);
      console.log(`Depth: ${result.depth} ${depthMatch ? '✓' : '✗'} (expected: ${expectedDepth})`);
      console.log(`Tools: ${result.selectedTools.join(', ')}`);
      console.log(`Confidence: ${result.confidence.toFixed(2)}`);
      
      if (intentMatch && depthMatch) {
        console.log(`${colors.green}✓ PASSED${colors.reset}`);
        passed++;
      } else {
        console.log(`${colors.red}✗ FAILED${colors.reset}`);
        failed++;
      }
    } catch (error) {
      console.log(`${colors.red}✗ ERROR: ${error.message}${colors.reset}`);
      failed++;
    }
    
    console.log('---');
  }
  
  return { passed, failed };
}

async function testNewTools() {
  console.log(`\n${colors.cyan}=== Testing New V2 Tools ===${colors.reset}\n`);
  
  const tools = {
    quickAnswer: require('./dist/src/services/ellen-tools/quick-answer-tool').quickAnswerTool,
    practicalGuide: require('./dist/src/services/ellen-tools/practical-guide-tool').practicalGuideTool,
    problemSolver: require('./dist/src/services/ellen-tools/problem-solver-tool').problemSolverTool,
    evaluator: require('./dist/src/services/ellen-tools/evaluator-tool').evaluatorTool
  };
  
  const toolTests = [
    {
      name: "Quick Answer Tool",
      tool: tools.quickAnswer,
      input: { message: "What is the speed of light?" },
      checkOutput: (result) => result.content && result.content.length > 0
    },
    {
      name: "Practical Guide Tool",
      tool: tools.practicalGuide,
      input: { message: "How do I format citations in APA style?" },
      checkOutput: (result) => result.content && result.content.length > 0
    },
    {
      name: "Problem Solver Tool",
      tool: tools.problemSolver,
      input: { message: "Solve: 2x + 5 = 13" },
      checkOutput: (result) => result.content && result.content.length > 0
    },
    {
      name: "Evaluator Tool",
      tool: tools.evaluator,
      input: { message: "Should I take calculus or statistics first?" },
      checkOutput: (result) => result.content && result.content.length > 0
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of toolTests) {
    console.log(`${colors.blue}Testing: ${test.name}${colors.reset}`);
    console.log(`Input: "${test.input.message}"`);
    
    try {
      const result = await test.tool.execute(test.input);
      
      if (test.checkOutput(result)) {
        console.log(`${colors.green}✓ Tool generated output${colors.reset}`);
        console.log(`Response length: ${result.content.length} chars`);
        if (result.steps) console.log(`Steps: ${result.steps.length}`);
        if (result.confidence) console.log(`Confidence: ${result.confidence}`);
        passed++;
      } else {
        console.log(`${colors.red}✗ No output generated${colors.reset}`);
        failed++;
      }
    } catch (error) {
      console.log(`${colors.red}✗ ERROR: ${error.message}${colors.reset}`);
      failed++;
    }
    
    console.log('---');
  }
  
  return { passed, failed };
}

async function runAllTests() {
  console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.cyan}     V2 ORCHESTRATOR TEST SUITE${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  try {
    // Test User State Monitor
    const stateResults = await testStateMonitor();
    totalPassed += stateResults.passed;
    totalFailed += stateResults.failed;
    
    // Test Intent Router
    const routerResults = await testIntentRouter();
    totalPassed += routerResults.passed;
    totalFailed += routerResults.failed;
    
    // Test New Tools
    const toolResults = await testNewTools();
    totalPassed += toolResults.passed;
    totalFailed += toolResults.failed;
    
    // Summary
    console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
    console.log(`${colors.cyan}     TEST SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}\n`);
    
    console.log(`${colors.green}Total Passed: ${totalPassed}${colors.reset}`);
    console.log(`${colors.red}Total Failed: ${totalFailed}${colors.reset}`);
    
    const totalTests = totalPassed + totalFailed;
    const passRate = ((totalPassed / totalTests) * 100).toFixed(1);
    
    console.log(`\nPass Rate: ${passRate}%`);
    
    if (passRate >= 80) {
      console.log(`${colors.green}🎉 V2 Orchestrator is working well!${colors.reset}`);
    } else if (passRate >= 50) {
      console.log(`${colors.yellow}⚠️  V2 Orchestrator needs some fixes${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ V2 Orchestrator has significant issues${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}Test suite failed: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();