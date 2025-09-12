#!/usr/bin/env node

/**
 * Test all 24 matrix combinations with dialogue evaluation
 * Shows actual queries and analyzes if Ellen's behavior matches expectations
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
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
};

// Test queries for each intent/depth combination
const testDialogues = {
  understand: {
    surface: {
      query: "What is machine learning?",
      expectedBehavior: "Should provide a quick, direct definition without Socratic questioning",
      expectedTool: "quick_answer",
      acceptableTool: "socratic_tool", // Fallback if quick_answer not implemented
      evaluation: "Check if response is concise (2-3 sentences) and direct"
    },
    guided: {
      query: "Can you explain how neural networks work?",
      expectedBehavior: "Should guide understanding through questions and conceptual building",
      expectedTool: "socratic_tool",
      acceptableTool: "socratic_tool",
      evaluation: "Check for guiding questions and progressive explanation"
    },
    deep: {
      query: "I want to understand the mathematical foundations of backpropagation and how it relates to gradient descent optimization",
      expectedBehavior: "Should create conceptual maps and deep theoretical exploration",
      expectedTool: "concept_mapper",
      acceptableTool: "socratic_tool",
      evaluation: "Check for comprehensive coverage and concept relationships"
    }
  },
  create: {
    surface: {
      query: "Help me write a quick thank you email to my professor",
      expectedBehavior: "Should provide immediate writing assistance with template/structure",
      expectedTool: "writing_assistant",
      acceptableTool: "writing_assistant",
      evaluation: "Check if provides concrete writing help, not philosophical discussion"
    },
    guided: {
      query: "I need to design a REST API for a todo app with user authentication",
      expectedBehavior: "Should guide through design decisions and architecture choices",
      expectedTool: "project_ideation_tool",
      acceptableTool: "socratic_tool",
      evaluation: "Check for systematic project planning and technical guidance"
    },
    deep: {
      query: "Let's create a comprehensive system architecture for a distributed microservices application with event sourcing",
      expectedBehavior: "Should explore creative architectural patterns and trade-offs deeply",
      expectedTool: "creative_exploration_tool",
      acceptableTool: "socratic_tool",
      evaluation: "Check for exploration of multiple approaches and deep technical discussion"
    }
  },
  solve: {
    surface: {
      query: "How do I fix this Python syntax error: 'unexpected indent'?",
      expectedBehavior: "Should provide direct solution without lengthy explanation",
      expectedTool: "problem_solver",
      acceptableTool: "socratic_tool",
      evaluation: "Check if gives immediate, actionable solution"
    },
    guided: {
      query: "Help me debug this sorting algorithm that's producing incorrect results for certain inputs",
      expectedBehavior: "Should guide through debugging process systematically",
      expectedTool: "socratic_tool",
      acceptableTool: "problem_solver",
      evaluation: "Check for systematic debugging approach and teaching moments"
    },
    deep: {
      query: "I need to solve this complex optimization problem with multiple constraints using dynamic programming",
      expectedBehavior: "Should help breakthrough mental blocks and explore solution space",
      expectedTool: "breakthrough_tool",
      acceptableTool: "socratic_tool",
      evaluation: "Check for deep problem analysis and breakthrough techniques"
    }
  },
  evaluate: {
    surface: {
      query: "Is using MongoDB a good choice for this project?",
      expectedBehavior: "Should provide quick evaluation with pros/cons",
      expectedTool: "evaluator_tool",
      acceptableTool: "socratic_tool",
      evaluation: "Check for direct assessment, not lengthy questioning"
    },
    guided: {
      query: "Review my code implementation and suggest improvements for this authentication system",
      expectedBehavior: "Should provide structured code review with specific suggestions",
      expectedTool: "review_tool",
      acceptableTool: "socratic_tool",
      evaluation: "Check for specific, actionable feedback on the code"
    },
    deep: {
      query: "Critically analyze this system design for scalability, security, and maintainability trade-offs",
      expectedBehavior: "Should provide deep critical analysis with multiple perspectives",
      expectedTool: "critical_analysis_tool",
      acceptableTool: "socratic_tool",
      evaluation: "Check for comprehensive analysis covering all aspects"
    }
  },
  organize: {
    surface: {
      query: "I need a quick study plan for tomorrow's exam",
      expectedBehavior: "Should create immediate, actionable study schedule",
      expectedTool: "plan_manager",
      acceptableTool: "plan_manager",
      evaluation: "Check for concrete timeline and specific tasks"
    },
    guided: {
      query: "Help me plan my learning path for becoming a full-stack developer",
      expectedBehavior: "Should create structured learning roadmap with milestones",
      expectedTool: "plan_manager",
      acceptableTool: "plan_manager",
      evaluation: "Check for phased approach with clear progression"
    },
    deep: {
      query: "Create a comprehensive project timeline with dependencies, milestones, and risk mitigation for this 6-month project",
      expectedBehavior: "Should create detailed project plan with all requested elements",
      expectedTool: "plan_manager",
      acceptableTool: "plan_manager",
      evaluation: "Check for comprehensive planning with dependencies and risks"
    }
  },
  regulate: {
    surface: {
      query: "I need to focus for the next 30 minutes to finish this task",
      expectedBehavior: "Should initiate focus session with timer/techniques",
      expectedTool: "focus_session",
      acceptableTool: "socratic_tool",
      evaluation: "Check for immediate focus support, not discussion"
    },
    guided: {
      query: "I'm feeling overwhelmed with this project and don't know where to start",
      expectedBehavior: "Should provide emotional support and break down overwhelm",
      expectedTool: "emotional_regulation_tool",
      acceptableTool: "socratic_tool",
      evaluation: "Check for empathy and concrete steps to manage overwhelm"
    },
    deep: {
      query: "I keep hitting mental blocks when trying to solve complex problems and need strategies to breakthrough",
      expectedBehavior: "Should explore breakthrough techniques and mental strategies",
      expectedTool: "breakthrough_tool",
      acceptableTool: "socratic_tool",
      evaluation: "Check for deep exploration of mental strategies"
    }
  },
  explore: {
    surface: {
      query: "What's the history of artificial intelligence?",
      expectedBehavior: "Should provide historical overview and timeline",
      expectedTool: "genealogy_tool",
      acceptableTool: "socratic_tool",
      evaluation: "Check for historical facts, not Socratic questioning"
    },
    guided: {
      query: "Let me explore different approaches to implementing authentication in web applications",
      expectedBehavior: "Should guide exploration of multiple approaches",
      expectedTool: "socratic_tool",
      acceptableTool: "socratic_tool",
      evaluation: "Check for exploration of alternatives with guidance"
    },
    deep: {
      query: "I want to investigate the theoretical implications of quantum computing on cryptography and information theory",
      expectedBehavior: "Should enable deep creative exploration of implications",
      expectedTool: "creative_exploration_tool",
      acceptableTool: "socratic_tool",
      evaluation: "Check for theoretical depth and creative connections"
    }
  },
  interact: {
    surface: {
      query: "Can we briefly discuss the pros and cons of microservices?",
      expectedBehavior: "Should facilitate brief discussion/collaboration",
      expectedTool: "peer_connector",
      acceptableTool: "socratic_tool",
      evaluation: "Check for conversational, collaborative tone"
    },
    guided: {
      query: "Let's work through this algorithm problem together step by step",
      expectedBehavior: "Should work collaboratively through the problem",
      expectedTool: "socratic_tool",
      acceptableTool: "socratic_tool",
      evaluation: "Check for collaborative problem-solving approach"
    },
    deep: {
      query: "I want to debate the architectural trade-offs between monolithic and microservices architectures",
      expectedBehavior: "Should engage in deep debate exploring multiple viewpoints",
      expectedTool: "debate_moderator",
      acceptableTool: "socratic_tool",
      evaluation: "Check for debate structure and multiple perspectives"
    }
  }
};

async function testDialogue(intent, depth, dialogueConfig, modelOverride = null) {
  const { IntentRouterTool } = await import('./dist/src/services/intent-router-tool.js');
  const { UserStateMonitor } = await import('./dist/src/services/user-state-monitor.js');
  
  const intentRouter = new IntentRouterTool();
  const stateMonitor = new UserStateMonitor();
  
  // Store original model if overriding
  let originalModel = null;
  if (modelOverride) {
    const { modelSelection } = await import('./dist/src/services/model-selection.js');
    originalModel = modelSelection.getCurrentModel?.();
    modelSelection.overrideModel?.(modelOverride);
  }
  
  // Analyze the query and capture raw response
  const routeResult = await intentRouter.routeIntent(dialogueConfig.query);
  const stateResult = await stateMonitor.analyzeState(dialogueConfig.query, [], 'socratic_tool');
  
  // Get the raw JSON response from the router (if available)
  const rawResponse = routeResult._raw || {
    primaryIntent: routeResult.primaryIntent,
    secondaryIntents: routeResult.secondaryIntents,
    depth: routeResult.depth,
    confidence: routeResult.confidence,
    reasoning: routeResult.reasoning
  };
  
  // Restore original model if overridden
  if (modelOverride && originalModel) {
    const { modelSelection } = await import('./dist/src/services/model-selection.js');
    modelSelection.overrideModel?.(originalModel);
  }
  
  // Determine if behavior matches expectations
  const toolMatch = routeResult.suggestedTool === dialogueConfig.expectedTool ||
                   routeResult.suggestedTool === dialogueConfig.acceptableTool;
  
  const intentMatch = routeResult.primaryIntent === intent;
  const depthMatch = routeResult.depth === depth;
  
  // Analyze appropriateness
  const appropriate = evaluateAppropriateness(
    dialogueConfig,
    routeResult,
    stateResult,
    toolMatch,
    intentMatch,
    depthMatch
  );
  
  return {
    query: dialogueConfig.query,
    expectedBehavior: dialogueConfig.expectedBehavior,
    actualBehavior: {
      tool: routeResult.suggestedTool,
      intent: routeResult.primaryIntent,
      depth: routeResult.depth,
      sentiment: stateResult.sentiment.type,
      frustration: stateResult.sentiment.frustrationLevel,
      confidence: routeResult.confidence
    },
    llmResponse: rawResponse,
    expectations: {
      tool: { expected: dialogueConfig.expectedTool, actual: routeResult.suggestedTool, match: toolMatch },
      intent: { expected: intent, actual: routeResult.primaryIntent, match: intentMatch },
      depth: { expected: depth, actual: routeResult.depth, match: depthMatch }
    },
    evaluation: dialogueConfig.evaluation,
    appropriate,
    overallPass: appropriate.score >= 0.6
  };
}

function evaluateAppropriateness(config, routeResult, stateResult, toolMatch, intentMatch, depthMatch) {
  const scores = {
    toolAppropriateness: 0,
    intentCorrectness: 0,
    depthAlignment: 0,
    behaviorMatch: 0
  };
  
  // Tool appropriateness (40% weight)
  if (toolMatch) {
    scores.toolAppropriateness = 1.0;
  } else if (routeResult.suggestedTool === 'socratic_tool') {
    scores.toolAppropriateness = 0.6; // Socratic is acceptable fallback
  }
  
  // Intent correctness (30% weight)
  scores.intentCorrectness = intentMatch ? 1.0 : 0.0;
  
  // Depth alignment (20% weight)
  scores.depthAlignment = depthMatch ? 1.0 : 0.5;
  
  // Behavior match (10% weight) - would need actual response to fully evaluate
  scores.behaviorMatch = toolMatch ? 0.8 : 0.5;
  
  const overallScore = (
    scores.toolAppropriateness * 0.4 +
    scores.intentCorrectness * 0.3 +
    scores.depthAlignment * 0.2 +
    scores.behaviorMatch * 0.1
  );
  
  return {
    scores,
    score: overallScore,
    assessment: overallScore >= 0.8 ? 'Excellent' :
                overallScore >= 0.6 ? 'Good' :
                overallScore >= 0.4 ? 'Needs Improvement' : 'Poor'
  };
}

async function runDialogueTests() {
  console.log(`${colors.bright}${colors.cyan}Matrix Dialogue Evaluation${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
  
  const results = [];
  const intents = Object.keys(testDialogues);
  const depths = ['surface', 'guided', 'deep'];
  
  let totalTests = 0;
  let passedTests = 0;
  
  for (const intent of intents) {
    console.log(`\n${colors.bright}${colors.blue}━━━ Intent: ${intent.toUpperCase()} ━━━${colors.reset}\n`);
    
    for (const depth of depths) {
      const dialogueConfig = testDialogues[intent][depth];
      const result = await testDialogue(intent, depth, dialogueConfig);
      results.push(result);
      totalTests++;
      
      if (result.overallPass) passedTests++;
      
      // Display dialogue and analysis
      console.log(`${colors.bright}[${intent}/${depth}]${colors.reset}`);
      console.log(`${colors.gray}User: "${result.query}"${colors.reset}\n`);
      
      console.log(`Expected Behavior:`);
      console.log(`  ${colors.cyan}${result.expectedBehavior}${colors.reset}`);
      
      console.log(`\nLLM JSON Response:`);
      console.log(`  ${colors.magenta}${JSON.stringify(result.llmResponse, null, 2).split('\n').join('\n  ')}${colors.reset}`);
      
      console.log(`\nActual Analysis:`);
      console.log(`  Tool: ${result.expectations.tool.match ? colors.green : colors.yellow}${result.actualBehavior.tool}${colors.reset} (expected: ${result.expectations.tool.expected})`);
      console.log(`  Intent: ${result.expectations.intent.match ? colors.green : colors.red}${result.actualBehavior.intent}${colors.reset} (expected: ${result.expectations.intent.expected})`);
      console.log(`  Depth: ${result.expectations.depth.match ? colors.green : colors.yellow}${result.actualBehavior.depth}${colors.reset} (expected: ${result.expectations.depth.expected})`);
      console.log(`  Sentiment: ${result.actualBehavior.sentiment}, Frustration: ${result.actualBehavior.frustration}/10`);
      console.log(`  Confidence: ${(result.actualBehavior.confidence * 100).toFixed(0)}%`);
      
      console.log(`\nEvaluation Criteria:`);
      console.log(`  ${colors.gray}${result.evaluation}${colors.reset}`);
      
      console.log(`\nAppropriateness Score: ${result.appropriate.score >= 0.6 ? colors.green : colors.yellow}${(result.appropriate.score * 100).toFixed(0)}% - ${result.appropriate.assessment}${colors.reset}`);
      
      const status = result.overallPass ? `${colors.green}✅ APPROPRIATE` : `${colors.red}❌ NEEDS ADJUSTMENT`;
      console.log(`Status: ${status}${colors.reset}`);
      
      console.log(`${colors.gray}${'─'.repeat(80)}${colors.reset}\n`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  // Summary Analysis
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}DIALOGUE EVALUATION SUMMARY${colors.reset}\n`);
  
  // Group results by issue type
  const issues = {
    wrongIntent: results.filter(r => !r.expectations.intent.match),
    wrongDepth: results.filter(r => !r.expectations.depth.match),
    wrongTool: results.filter(r => !r.expectations.tool.match && r.actualBehavior.tool !== 'socratic_tool'),
    lowConfidence: results.filter(r => r.actualBehavior.confidence < 0.5)
  };
  
  console.log(`${colors.bright}Overall Results:${colors.reset}`);
  console.log(`  Total Dialogues Tested: ${totalTests}`);
  console.log(`  Appropriate Responses: ${colors.green}${passedTests}${colors.reset} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`  Need Adjustment: ${colors.yellow}${totalTests - passedTests}${colors.reset} (${((1 - passedTests/totalTests)*100).toFixed(1)}%)`);
  
  console.log(`\n${colors.bright}Issue Analysis:${colors.reset}`);
  console.log(`  Wrong Intent Detection: ${colors.red}${issues.wrongIntent.length}${colors.reset} cases`);
  if (issues.wrongIntent.length > 0) {
    issues.wrongIntent.slice(0, 3).forEach(r => {
      console.log(`    • "${r.query.substring(0, 50)}..." → ${r.actualBehavior.intent} (expected: ${r.expectations.intent.expected})`);
    });
  }
  
  console.log(`  Wrong Depth Detection: ${colors.yellow}${issues.wrongDepth.length}${colors.reset} cases`);
  if (issues.wrongDepth.length > 0) {
    issues.wrongDepth.slice(0, 3).forEach(r => {
      console.log(`    • "${r.query.substring(0, 50)}..." → ${r.actualBehavior.depth} (expected: ${r.expectations.depth.expected})`);
    });
  }
  
  console.log(`  Wrong Tool Selection: ${colors.yellow}${issues.wrongTool.length}${colors.reset} cases`);
  console.log(`  Low Confidence: ${colors.yellow}${issues.lowConfidence.length}${colors.reset} cases`);
  
  // Pattern Analysis
  console.log(`\n${colors.bright}Pattern Analysis:${colors.reset}`);
  const byIntent = {};
  const byDepth = {};
  
  results.forEach(r => {
    const intent = r.expectations.intent.expected;
    const depth = r.expectations.depth.expected;
    
    if (!byIntent[intent]) byIntent[intent] = { pass: 0, total: 0 };
    if (!byDepth[depth]) byDepth[depth] = { pass: 0, total: 0 };
    
    byIntent[intent].total++;
    byDepth[depth].total++;
    
    if (r.overallPass) {
      byIntent[intent].pass++;
      byDepth[depth].pass++;
    }
  });
  
  console.log(`  By Intent:`);
  Object.entries(byIntent).forEach(([intent, stats]) => {
    const rate = (stats.pass / stats.total * 100).toFixed(0);
    const color = rate >= 70 ? colors.green : rate >= 50 ? colors.yellow : colors.red;
    console.log(`    ${intent.padEnd(12)} ${color}${rate}%${colors.reset} (${stats.pass}/${stats.total})`);
  });
  
  console.log(`  By Depth:`);
  Object.entries(byDepth).forEach(([depth, stats]) => {
    const rate = (stats.pass / stats.total * 100).toFixed(0);
    const color = rate >= 70 ? colors.green : rate >= 50 ? colors.yellow : colors.red;
    console.log(`    ${depth.padEnd(12)} ${color}${rate}%${colors.reset} (${stats.pass}/${stats.total})`);
  });
  
  // Recommendations
  console.log(`\n${colors.bright}Key Recommendations:${colors.reset}`);
  
  if (issues.wrongIntent.length > totalTests * 0.3) {
    console.log(`  ${colors.red}⚠ Critical:${colors.reset} Intent detection needs improvement (${issues.wrongIntent.length} failures)`);
    console.log(`    → Review intent classification prompts and training examples`);
  }
  
  if (issues.wrongDepth.length > totalTests * 0.3) {
    console.log(`  ${colors.yellow}⚠ Important:${colors.reset} Depth detection accuracy is low`);
    console.log(`    → Add more depth indicators to classification logic`);
  }
  
  const toolsNeeded = new Set(results.filter(r => !r.expectations.tool.match).map(r => r.expectations.tool.expected));
  if (toolsNeeded.size > 0) {
    console.log(`  ${colors.yellow}⚠ Missing Tools:${colors.reset} ${toolsNeeded.size} tools need implementation`);
    Array.from(toolsNeeded).forEach(tool => {
      console.log(`    → Implement: ${tool}`);
    });
  }
  
  // Final Assessment
  const overallScore = (passedTests / totalTests) * 100;
  console.log(`\n${colors.bright}Final Assessment:${colors.reset}`);
  if (overallScore >= 80) {
    console.log(`  ${colors.green}✅ Excellent! Ellen is behaving appropriately in most cases.${colors.reset}`);
  } else if (overallScore >= 60) {
    console.log(`  ${colors.yellow}⚠ Good, but improvements needed for better user experience.${colors.reset}`);
  } else {
    console.log(`  ${colors.red}❌ Significant improvements needed in intent/tool routing.${colors.reset}`);
  }
}

// Run tests
runDialogueTests().catch(error => {
  console.error(`${colors.red}Test failed:${colors.reset}`, error);
  process.exit(1);
});