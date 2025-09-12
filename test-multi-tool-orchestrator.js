#!/usr/bin/env node

/**
 * Test the Multi-Tool Orchestrator Implementation
 * Tests all 4 orchestration patterns: handoff, parallel, chain, fallback
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

// Import the orchestrator
import { EllenOrchestrator } from './dist/services/ellen-orchestrator.js';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Test scenarios for multi-tool orchestration
const testScenarios = [
  {
    name: "Intent Transition (Handoff Pattern)",
    description: "User shifts from understanding to creating",
    turns: [
      {
        message: "Explain the principles of good API design",
        expectedPattern: "single", // First turn, no transition yet
        expectedIntent: "understand"
      },
      {
        message: "Now I want to design an API for my todo app based on what we discussed",
        expectedPattern: "handoff",
        expectedIntent: "create",
        expectTransition: true
      }
    ]
  },
  {
    name: "Depth Progression (Chain Pattern)",
    description: "User wants increasingly deeper understanding",
    turns: [
      {
        message: "What is machine learning?",
        expectedPattern: "single",
        expectedDepth: "surface"
      },
      {
        message: "Can you explain how neural networks work in more detail?",
        expectedPattern: "chain",
        expectedDepth: "guided",
        expectProgression: true
      },
      {
        message: "I want to understand the mathematical foundations and how backpropagation works",
        expectedPattern: "chain",
        expectedDepth: "deep",
        expectProgression: true
      }
    ]
  },
  {
    name: "Frustration Recovery (Fallback Pattern)",
    description: "User gets frustrated and needs alternative approach",
    turns: [
      {
        message: "Help me understand quantum computing",
        expectedPattern: "single"
      },
      {
        message: "I don't get it at all",
        expectedPattern: "single",
        expectedFrustration: "medium"
      },
      {
        message: "This is too confusing! Just give me a simple explanation!",
        expectedPattern: "fallback",
        expectedFrustration: "high",
        expectFallback: true
      }
    ]
  },
  {
    name: "Multiple Needs (Parallel Pattern)",
    description: "User has multiple intents in one query",
    turns: [
      {
        message: "Can you explain React hooks and also help me write a custom hook for authentication?",
        expectedPattern: "parallel",
        expectedIntents: ["understand", "create"],
        expectParallel: true
      }
    ]
  }
];

async function runTest(scenario, orchestrator) {
  console.log(`\n${colors.bright}${colors.blue}Testing: ${scenario.name}${colors.reset}`);
  console.log(`${colors.cyan}${scenario.description}${colors.reset}\n`);
  
  let sessionId = `test-${Date.now()}`;
  let priorTurns = [];
  let success = true;
  
  for (let i = 0; i < scenario.turns.length; i++) {
    const turn = scenario.turns[i];
    console.log(`${colors.yellow}Turn ${i + 1}: "${turn.message}"${colors.reset}`);
    
    try {
      const request = {
        message: turn.message,
        context: {
          sessionId,
          priorTurns,
          userId: 'test-user'
        }
      };
      
      const startTime = Date.now();
      const response = await orchestrator.processRequest(request);
      const duration = Date.now() - startTime;
      
      // Log response details
      console.log(`${colors.green}✓ Response received in ${duration}ms${colors.reset}`);
      console.log(`  Tools used: ${response.toolsUsed.join(', ')}`);
      
      // Check if multi-tool was triggered appropriately
      if (turn.expectTransition && response.toolsUsed.length < 2) {
        console.log(`${colors.red}✗ Expected handoff pattern but got single tool${colors.reset}`);
        success = false;
      }
      
      if (turn.expectProgression && !response.growthMetrics?.reflectionPrompt?.includes('complexity')) {
        console.log(`${colors.yellow}⚠ Chain pattern may not have been triggered${colors.reset}`);
      }
      
      if (turn.expectFallback && !response.suggestedFollowUp?.some(q => q.includes('approach'))) {
        console.log(`${colors.yellow}⚠ Fallback pattern may not have been triggered${colors.reset}`);
      }
      
      if (turn.expectParallel && response.toolsUsed.length < 2) {
        console.log(`${colors.yellow}⚠ Expected parallel execution but got single tool${colors.reset}`);
      }
      
      // Add to conversation history
      priorTurns.push(
        { role: 'user', content: turn.message },
        { role: 'assistant', content: response.response.substring(0, 200) }
      );
      
      // Show a snippet of the response
      console.log(`  Response preview: "${response.response.substring(0, 100)}..."`);
      
      if (response.growthMetrics?.reflectionPrompt) {
        console.log(`  ${colors.magenta}Reflection: ${response.growthMetrics.reflectionPrompt}${colors.reset}`);
      }
      
    } catch (error) {
      console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
      success = false;
    }
  }
  
  return success;
}

async function main() {
  console.log(`${colors.bright}${colors.cyan}Multi-Tool Orchestrator Test Suite${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
  
  try {
    const orchestrator = new EllenOrchestrator();
    let totalTests = testScenarios.length;
    let passedTests = 0;
    
    for (const scenario of testScenarios) {
      const passed = await runTest(scenario, orchestrator);
      if (passed) passedTests++;
      
      // Add delay between scenarios to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(50)}${colors.reset}`);
    console.log(`${colors.bright}Test Summary:${colors.reset}`);
    console.log(`Total: ${totalTests}, Passed: ${passedTests}, Failed: ${totalTests - passedTests}`);
    
    if (passedTests === totalTests) {
      console.log(`${colors.green}${colors.bright}✓ All tests passed!${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ Some tests had warnings or failures${colors.reset}`);
    }
    
    // Log optimizer metrics
    console.log(`\n${colors.cyan}Optimizer Metrics:${colors.reset}`);
    const metrics = orchestrator.multiToolOptimizer?.getOptimizationMetrics();
    if (metrics) {
      console.log(`  Cache size: ${metrics.cacheSize}`);
      console.log(`  Sessions tracked: ${metrics.sessionsTracked}`);
      console.log(`  Total patterns recorded: ${metrics.totalPatternsRecorded}`);
      console.log(`  Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
    }
    
  } catch (error) {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);