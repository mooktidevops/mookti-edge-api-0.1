#!/usr/bin/env node

/**
 * V2 Orchestrator Test Suite
 * Tests User State Monitor, Intent Router, and new tools
 */

require('dotenv').config();

const TEST_SCENARIOS = [
  {
    name: "Quick Answer Request",
    messages: [
      "What is the quadratic formula?"
    ],
    expected: {
      intent: "understand",
      depth: "surface",
      tool: "quick_answer",
      frustration: 0
    }
  },
  {
    name: "Practical Guidance",
    messages: [
      "How do I write a lab report for chemistry?"
    ],
    expected: {
      intent: "understand",
      depth: "guided",
      tool: "practical_guide",
      frustration: 0
    }
  },
  {
    name: "Problem Solving",
    messages: [
      "Help me solve this integral: ∫x²dx"
    ],
    expected: {
      intent: "solve",
      depth: "guided",
      tool: "problem_solver",
      frustration: 0
    }
  },
  {
    name: "Decision Making",
    messages: [
      "Should I drop my calculus class?"
    ],
    expected: {
      intent: "evaluate",
      depth: "guided",
      tool: "evaluator_tool",
      frustration: 0
    }
  },
  {
    name: "Writing Task",
    messages: [
      "I need to write an essay about climate change"
    ],
    expected: {
      intent: "create",
      depth: "guided",
      tool: "writing_coach",
      frustration: 0
    }
  },
  {
    name: "Frustration Detection",
    messages: [
      "I don't understand this at all",
      "This is so confusing, I give up"
    ],
    expected: {
      intent: "understand",
      depth: "surface",
      tool: "any",
      frustration: 7 // Should be high
    }
  },
  {
    name: "Depth Progression",
    messages: [
      "What is photosynthesis?",
      "Tell me more about the light reactions",
      "Why does the electron transport chain matter?"
    ],
    expected: {
      intent: "understand",
      depth: "deep", // Should progress from surface to deep
      tool: "socratic_tool",
      frustration: 0
    }
  },
  {
    name: "Intent Shift",
    messages: [
      "Explain the French Revolution",
      "Now I need to write an essay about it"
    ],
    expected: {
      intent: "create", // Should shift from understand to create
      depth: "guided",
      tool: "writing_coach",
      frustration: 0
    }
  }
];

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

async function testStateMonitor() {
  console.log(`\n${colors.cyan}=== Testing User State Monitor ===${colors.reset}\n`);
  
  const { UserStateMonitor } = require('./src/services/user-state-monitor');
  const monitor = new UserStateMonitor();
  
  for (const scenario of TEST_SCENARIOS.slice(0, 3)) {
    console.log(`${colors.blue}Testing: ${scenario.name}${colors.reset}`);
    
    const state = await monitor.analyzeState(
      scenario.messages[0],
      [],
      'socratic_tool'
    );
    
    console.log(`Intent: ${state.intent.current} (expected: ${scenario.expected.intent})`);
    console.log(`Depth: ${state.depth.current} (expected: ${scenario.expected.depth})`);
    console.log(`Frustration: ${state.sentiment.frustrationLevel}`);
    console.log(`Suggested tool: ${monitor.selectToolFromState(state)}`);
    
    const passed = 
      state.intent.current === scenario.expected.intent &&
      state.depth.current === scenario.expected.depth;
    
    console.log(passed ? `${colors.green}✓ PASSED${colors.reset}` : `${colors.red}✗ FAILED${colors.reset}`);
    console.log('---');
  }
}

async function testIntentRouter() {
  console.log(`\n${colors.cyan}=== Testing Intent Router ===${colors.reset}\n`);
  
  const { intentRouter } = require('./src/services/ellen-tools/intent-router-tool');
  
  for (const scenario of TEST_SCENARIOS.slice(0, 5)) {
    console.log(`${colors.blue}Testing: ${scenario.name}${colors.reset}`);
    
    const result = await intentRouter.execute({
      message: scenario.messages[0],
      conversationHistory: []
    });
    
    console.log(`Intent: ${result.primaryIntent} (expected: ${scenario.expected.intent})`);
    console.log(`Depth: ${result.depth} (expected: ${scenario.expected.depth})`);
    console.log(`Tools: ${result.selectedTools.join(', ')}`);
    console.log(`Confidence: ${result.confidence}`);
    
    const passed = 
      result.primaryIntent === scenario.expected.intent &&
      result.depth === scenario.expected.depth;
    
    console.log(passed ? `${colors.green}✓ PASSED${colors.reset}` : `${colors.red}✗ FAILED${colors.reset}`);
    console.log('---');
  }
}

async function testFullOrchestration() {
  console.log(`\n${colors.cyan}=== Testing Full V2 Orchestration ===${colors.reset}\n`);
  
  const baseUrl = 'http://localhost:3210';
  
  for (const scenario of TEST_SCENARIOS.slice(0, 3)) {
    console.log(`${colors.blue}Testing: ${scenario.name}${colors.reset}`);
    console.log(`Message: "${scenario.messages[0]}"`);
    
    try {
      const response = await fetch(`${baseUrl}/api/chat/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: scenario.messages[0],
          context: {
            userId: 'test-v2',
            sessionId: `test-v2-${Date.now()}`
          }
        })
      });
      
      if (!response.ok) {
        console.log(`${colors.red}HTTP Error: ${response.status}${colors.reset}`);
        continue;
      }
      
      const data = await response.json();
      
      console.log(`Tools used: ${data.toolsUsed?.join(', ') || 'none'}`);
      console.log(`Response length: ${data.response?.length || 0} chars`);
      
      // Check if the right tool was used
      const expectedToolUsed = data.toolsUsed?.includes(scenario.expected.tool);
      console.log(expectedToolUsed ? `${colors.green}✓ Correct tool${colors.reset}` : `${colors.yellow}⚠ Different tool used${colors.reset}`);
      
    } catch (error) {
      console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
    }
    
    console.log('---');
  }
}

async function testConversationProgression() {
  console.log(`\n${colors.cyan}=== Testing Conversation Progression ===${colors.reset}\n`);
  
  const { UserStateMonitor } = require('./src/services/user-state-monitor');
  const monitor = new UserStateMonitor();
  
  // Test depth progression
  const depthScenario = TEST_SCENARIOS.find(s => s.name === "Depth Progression");
  console.log(`${colors.blue}Testing: ${depthScenario.name}${colors.reset}`);
  
  const conversationHistory = [];
  let lastState;
  
  for (const message of depthScenario.messages) {
    console.log(`\nUser: "${message}"`);
    
    const state = await monitor.analyzeState(
      message,
      conversationHistory,
      'socratic_tool'
    );
    
    console.log(`Depth: ${state.depth.current}`);
    console.log(`Progression: ${state.dynamics.progressionPattern}`);
    
    conversationHistory.push(
      { role: 'user', content: message },
      { role: 'assistant', content: 'Response here...' }
    );
    
    lastState = state;
  }
  
  const deepeningDetected = lastState?.depth.current === 'deep';
  console.log(deepeningDetected ? 
    `${colors.green}✓ Depth progression detected${colors.reset}` : 
    `${colors.red}✗ Depth progression not detected${colors.reset}`
  );
  
  // Test intent shift
  monitor.resetState();
  const shiftScenario = TEST_SCENARIOS.find(s => s.name === "Intent Shift");
  console.log(`\n${colors.blue}Testing: ${shiftScenario.name}${colors.reset}`);
  
  const shiftHistory = [];
  let previousIntent;
  
  for (const message of shiftScenario.messages) {
    console.log(`\nUser: "${message}"`);
    
    const state = await monitor.analyzeState(
      message,
      shiftHistory,
      'socratic_tool'
    );
    
    console.log(`Intent: ${state.intent.current}`);
    if (previousIntent && state.intent.changed) {
      console.log(`${colors.magenta}Intent shifted: ${previousIntent} → ${state.intent.current}${colors.reset}`);
    }
    
    shiftHistory.push(
      { role: 'user', content: message },
      { role: 'assistant', content: 'Response...' }
    );
    
    previousIntent = state.intent.current;
  }
}

async function runAllTests() {
  console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.cyan}     V2 ORCHESTRATOR TEST SUITE${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
  
  try {
    // Test individual components
    await testStateMonitor();
    await testIntentRouter();
    await testConversationProgression();
    
    // Test full orchestration if server is running
    console.log(`\n${colors.yellow}Note: Full orchestration test requires server at localhost:3210${colors.reset}`);
    const serverCheck = await fetch('http://localhost:3210/api/health').catch(() => null);
    if (serverCheck) {
      await testFullOrchestration();
    } else {
      console.log(`${colors.yellow}Server not running - skipping full orchestration tests${colors.reset}`);
    }
    
    console.log(`\n${colors.green}${'='.repeat(50)}${colors.reset}`);
    console.log(`${colors.green}     TEST SUITE COMPLETE${colors.reset}`);
    console.log(`${colors.green}${'='.repeat(50)}${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Test suite failed: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();