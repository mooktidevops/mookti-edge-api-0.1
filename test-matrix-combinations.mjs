#!/usr/bin/env node

/**
 * Test all 24 matrix combinations (8 intents × 3 depths)
 * Verifies tool selection and state analysis for each combination
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

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

// Test queries for each intent
const testQueries = {
  understand: {
    surface: "What is machine learning?",
    guided: "Can you explain how neural networks work?",
    deep: "I want to understand the mathematical foundations of backpropagation"
  },
  create: {
    surface: "Help me write a quick email",
    guided: "I need to design a REST API for my project",
    deep: "Let's create a comprehensive system architecture for a distributed application"
  },
  solve: {
    surface: "How do I fix this syntax error?",
    guided: "Help me debug this algorithm that's not working correctly",
    deep: "I need to solve this complex optimization problem with multiple constraints"
  },
  evaluate: {
    surface: "Is this approach good?",
    guided: "Review my code and suggest improvements",
    deep: "Critically analyze this system design for scalability and security"
  },
  organize: {
    surface: "I need a quick study plan",
    guided: "Help me plan my learning path for web development",
    deep: "Create a comprehensive project timeline with milestones and dependencies"
  },
  regulate: {
    surface: "I need to focus for 30 minutes",
    guided: "I'm feeling overwhelmed with this project",
    deep: "I keep hitting mental blocks and need strategies to breakthrough"
  },
  explore: {
    surface: "What's the history of AI?",
    guided: "Let me explore different approaches to solving this",
    deep: "I want to investigate the theoretical implications of quantum computing"
  },
  interact: {
    surface: "Can we discuss this briefly?",
    guided: "Let's work through this problem together",
    deep: "I want to debate the pros and cons of different architectural patterns"
  }
};

// Expected tools for each combination
const expectedTools = {
  'understand/surface': 'quick_answer',
  'understand/guided': 'socratic_tool',
  'understand/deep': 'concept_mapper',
  'create/surface': 'writing_assistant',
  'create/guided': 'project_ideation_tool',
  'create/deep': 'creative_exploration_tool',
  'solve/surface': 'problem_solver',
  'solve/guided': 'socratic_tool',
  'solve/deep': 'breakthrough_tool',
  'evaluate/surface': 'evaluator_tool',
  'evaluate/guided': 'review_tool',
  'evaluate/deep': 'critical_analysis_tool',
  'organize/surface': 'plan_manager',
  'organize/guided': 'plan_manager',
  'organize/deep': 'plan_manager',
  'regulate/surface': 'focus_session',
  'regulate/guided': 'emotional_regulation_tool',
  'regulate/deep': 'breakthrough_tool',
  'explore/surface': 'genealogy_tool',
  'explore/guided': 'socratic_tool',
  'explore/deep': 'creative_exploration_tool',
  'interact/surface': 'peer_connector',
  'interact/guided': 'socratic_tool',
  'interact/deep': 'debate_moderator'
};

async function testMatrixCombination(intent, depth, query) {
  const { IntentRouterTool } = await import('./dist/src/services/intent-router-tool.js');
  const { UserStateMonitor } = await import('./dist/src/services/user-state-monitor.js');
  
  const intentRouter = new IntentRouterTool();
  const stateMonitor = new UserStateMonitor();
  
  // Test intent routing
  const routeResult = await intentRouter.routeIntent(query);
  
  // Test state analysis
  const stateResult = await stateMonitor.analyzeState(query, [], 'socratic_tool');
  
  const expectedTool = expectedTools[`${intent}/${depth}`];
  const actualTool = routeResult.suggestedTool;
  const passed = actualTool === expectedTool || 
                 (actualTool === 'socratic_tool' && !isToolImplemented(expectedTool));
  
  return {
    combination: `${intent}/${depth}`,
    query: query.substring(0, 50) + '...',
    expected: expectedTool,
    actual: actualTool,
    intent: {
      detected: routeResult.primaryIntent,
      correct: routeResult.primaryIntent === intent
    },
    depth: {
      detected: routeResult.depth,
      correct: routeResult.depth === depth
    },
    state: {
      sentiment: stateResult.sentiment.type,
      frustration: stateResult.sentiment.frustrationLevel,
      suggestedTool: stateResult.tooling.suggestedTool
    },
    passed
  };
}

function isToolImplemented(toolName) {
  const implementedTools = [
    'quick_answer', 'socratic_tool', 'concept_mapper',
    'writing_assistant', 'project_ideation_tool', 'problem_solver',
    'evaluator_tool', 'review_tool', 'plan_manager',
    'focus_session', 'genealogy_tool', 'practical_guide'
  ];
  return implementedTools.includes(toolName);
}

async function runMatrixTests() {
  console.log(`${colors.bright}${colors.cyan}Testing All 24 Matrix Combinations${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  
  const results = [];
  const intents = ['understand', 'create', 'solve', 'evaluate', 'organize', 'regulate', 'explore', 'interact'];
  const depths = ['surface', 'guided', 'deep'];
  
  let totalTests = 0;
  let passedTests = 0;
  let intentCorrect = 0;
  let depthCorrect = 0;
  
  for (const intent of intents) {
    console.log(`\n${colors.bright}${colors.blue}Intent: ${intent}${colors.reset}`);
    
    for (const depth of depths) {
      const query = testQueries[intent][depth];
      const result = await testMatrixCombination(intent, depth, query);
      results.push(result);
      totalTests++;
      
      if (result.passed) passedTests++;
      if (result.intent.correct) intentCorrect++;
      if (result.depth.correct) depthCorrect++;
      
      // Display result
      const statusIcon = result.passed ? `${colors.green}✅` : `${colors.red}✗`;
      const toolMatch = result.actual === result.expected ? 
        `${colors.green}${result.actual}` : 
        `${colors.yellow}${result.actual} (expected: ${result.expected})`;
      
      console.log(`  ${depth}: ${statusIcon} ${toolMatch}${colors.reset}`);
      console.log(`    Intent: ${result.intent.detected} ${result.intent.correct ? '✓' : '✗'}`);
      console.log(`    Depth: ${result.depth.detected} ${result.depth.correct ? '✓' : '✗'}`);
      console.log(`    State: ${result.state.sentiment}, frustration: ${result.state.frustration}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Summary
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}Matrix Coverage Summary:${colors.reset}`);
  console.log(`  Total combinations: ${totalTests}`);
  console.log(`  Tool selection accuracy: ${colors.yellow}${((passedTests/totalTests)*100).toFixed(1)}%${colors.reset} (${passedTests}/${totalTests})`);
  console.log(`  Intent detection accuracy: ${colors.yellow}${((intentCorrect/totalTests)*100).toFixed(1)}%${colors.reset} (${intentCorrect}/${totalTests})`);
  console.log(`  Depth detection accuracy: ${colors.yellow}${((depthCorrect/totalTests)*100).toFixed(1)}%${colors.reset} (${depthCorrect}/${totalTests})`);
  
  // Missing tools analysis
  const missingTools = new Set();
  results.forEach(r => {
    if (!isToolImplemented(r.expected)) {
      missingTools.add(r.expected);
    }
  });
  
  if (missingTools.size > 0) {
    console.log(`\n${colors.yellow}Missing Tools (falling back to socratic_tool):${colors.reset}`);
    missingTools.forEach(tool => console.log(`  - ${tool}`));
  }
  
  // Pattern coverage
  const patternCoverage = {
    handoff: results.filter(r => r.state.suggestedTool && r.state.suggestedTool !== 'socratic_tool').length,
    depth: results.filter(r => r.depth.correct).length,
    frustration: results.filter(r => r.state.frustration > 0.5).length
  };
  
  console.log(`\n${colors.bright}Pattern Detection Coverage:${colors.reset}`);
  console.log(`  Tool switching opportunities: ${patternCoverage.handoff}`);
  console.log(`  Depth variations detected: ${patternCoverage.depth}`);
  console.log(`  Frustration cases: ${patternCoverage.frustration}`);
  
  // Overall assessment
  const overallScore = ((passedTests + intentCorrect + depthCorrect) / (totalTests * 3)) * 100;
  console.log(`\n${colors.bright}Overall Score: ${overallScore >= 70 ? colors.green : colors.yellow}${overallScore.toFixed(1)}%${colors.reset}`);
  
  if (overallScore >= 70) {
    console.log(`${colors.green}✅ Matrix coverage is good!${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ Matrix coverage needs improvement${colors.reset}`);
  }
}

// Run tests
runMatrixTests().catch(error => {
  console.error(`${colors.red}Test failed:${colors.reset}`, error);
  process.exit(1);
});