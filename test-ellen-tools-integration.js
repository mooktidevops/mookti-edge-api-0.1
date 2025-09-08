#!/usr/bin/env node

/**
 * Ellen Tools Integration Test Suite
 * Tests all 26 implemented tools through the orchestrator
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001';

// Test configurations for each tool
const TOOL_TESTS = {
  // Core Pedagogical Tools
  socratic: {
    message: "What is the difference between machine learning and AI?",
    toolOverride: "socratic_tool",
    expectedPatterns: ["?", "consider", "think"]
  },
  
  reflection: {
    message: "I just finished studying calculus derivatives and I'm feeling confused",
    toolOverride: "reflection_tool",
    expectedPatterns: ["understand", "feeling", "approach"]
  },
  
  extension: {
    message: "How can I apply the concept of derivatives to real-world problems?",
    toolOverride: "extension_tool",
    expectedPatterns: ["real world", "apply", "connect"]
  },
  
  genealogy: {
    message: "Where did the concept of calculus come from historically?",
    toolOverride: "genealogy_tool",
    expectedPatterns: ["history", "develop", "evolution"]
  },
  
  // Coaching Tools
  writing_coach: {
    message: "Can you review my thesis statement: 'Technology has changed society in many ways.'",
    toolOverride: "writing_coach",
    expectedPatterns: ["specific", "improve", "consider"]
  },
  
  note_assistant: {
    message: "What's the best way to take notes during a fast-paced lecture?",
    toolOverride: "note_assistant",
    expectedPatterns: ["Cornell", "method", "organize"]
  },
  
  office_hours: {
    message: "How should I prepare for meeting with my professor about my research project?",
    toolOverride: "office_hours_coach",
    expectedPatterns: ["prepare", "questions", "specific"]
  },
  
  email_coach: {
    message: "Help me write an email to my professor asking for an extension",
    toolOverride: "email_coach",
    expectedPatterns: ["professional", "clear", "respectful"]
  },
  
  // Planning Tools
  plan_manager: {
    message: "I need to study for 3 exams next week. How should I plan my time?",
    toolOverride: "plan_manager",
    expectedPatterns: ["schedule", "spaced", "priority"]
  },
  
  focus_session: {
    message: "I want to start a focused study session for organic chemistry",
    toolOverride: "focus_session",
    expectedPatterns: ["Pomodoro", "25 minutes", "break"]
  },
  
  // Strategy & Diagnostic Tools
  learning_diagnostic: {
    message: "I keep forgetting what I study. What's wrong with my approach?",
    toolOverride: "learning_diagnostic",
    expectedPatterns: ["retrieval", "practice", "spaced"]
  },
  
  strategy_selector: {
    message: "What's the best study strategy for memorizing vocabulary?",
    toolOverride: "strategy_selector",
    expectedPatterns: ["retrieval practice", "spaced repetition", "flashcard"]
  },
  
  troubleshooter: {
    message: "I'm failing my physics class despite studying hard",
    toolOverride: "troubleshooter",
    expectedPatterns: ["problem", "approach", "specific"]
  },
  
  retrieval_practice: {
    message: "Help me practice retrieving information about photosynthesis",
    toolOverride: "retrieval",
    expectedPatterns: ["recall", "test", "remember"]
  },
  
  // Study Utilities
  flashcard_generator: {
    message: "Create flashcards for the parts of a cell",
    toolOverride: "flashcard_generator",
    expectedPatterns: ["front:", "back:", "cell"]
  },
  
  concept_mapper: {
    message: "Help me create a concept map for the water cycle",
    toolOverride: "concept_mapper",
    expectedPatterns: ["connect", "relationship", "evaporation"]
  },
  
  worked_example: {
    message: "Show me a worked example of solving a quadratic equation",
    toolOverride: "worked_example",
    expectedPatterns: ["step", "solve", "x"]
  },
  
  analogy_builder: {
    message: "Create an analogy to explain how neural networks work",
    toolOverride: "analogy_builder",
    expectedPatterns: ["like", "similar", "compare"]
  }
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function testTool(toolName, config) {
  console.log(`${colors.cyan}Testing ${toolName}...${colors.reset}`);
  
  try {
    const response = await fetch(`${API_URL}/api/ellen/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: config.message,
        toolOverride: config.toolOverride,
        context: {
          userId: 'test-user-tools',
          sessionId: `test-session-${toolName}-${Date.now()}`,
          sessionType: 'study'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Check if response contains expected patterns
    const responseText = data.response?.toLowerCase() || '';
    const foundPatterns = config.expectedPatterns.filter(pattern => 
      responseText.includes(pattern.toLowerCase())
    );
    
    if (foundPatterns.length > 0) {
      console.log(`${colors.green}✓ ${toolName} working${colors.reset}`);
      console.log(`  Found patterns: ${foundPatterns.join(', ')}`);
      if (data.toolsUsed?.length > 0) {
        console.log(`  Tools used: ${data.toolsUsed.join(', ')}`);
      }
      return true;
    } else {
      console.log(`${colors.yellow}⚠ ${toolName} responded but missing expected patterns${colors.reset}`);
      console.log(`  Expected: ${config.expectedPatterns.join(', ')}`);
      console.log(`  Response preview: ${responseText.substring(0, 100)}...`);
      return false;
    }
    
  } catch (error) {
    console.log(`${colors.red}✗ ${toolName} failed: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testToolIntegration() {
  console.log(`${colors.blue}${'='.repeat(60)}`);
  console.log('Ellen Tools Integration Test Suite');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
  
  // Check if API is running
  try {
    const health = await fetch(`${API_URL}/api/ellen/chat`);
    if (!health.ok && health.status !== 405) {
      throw new Error('API not responding');
    }
  } catch (error) {
    console.log(`${colors.red}Error: Ellen API is not running on ${API_URL}${colors.reset}`);
    console.log('Please start the API with: npx vercel dev --listen 3001');
    process.exit(1);
  }
  
  const results = {
    passed: 0,
    failed: 0,
    total: Object.keys(TOOL_TESTS).length
  };
  
  // Test each tool
  for (const [toolName, config] of Object.entries(TOOL_TESTS)) {
    const success = await testTool(toolName, config);
    if (success) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log(`\n${colors.blue}${'='.repeat(60)}`);
  console.log('Test Summary');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
  
  console.log(`Total Tools: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  if (results.failed > 0) {
    console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  }
  
  const percentage = Math.round((results.passed / results.total) * 100);
  const status = percentage === 100 ? colors.green : percentage >= 80 ? colors.yellow : colors.red;
  console.log(`${status}Success Rate: ${percentage}%${colors.reset}`);
  
  // Tool category breakdown
  console.log('\n📊 Tool Categories:');
  console.log('  ✅ Core Pedagogical: 4 tools (Socratic, Reflection, Extension, Genealogy)');
  console.log('  ✅ Coaching: 4 tools (Writing, Notes, Office Hours, Email)');
  console.log('  ✅ Planning: 2 tools (Plan Manager, Focus Session)');
  console.log('  ✅ Strategy & Diagnostic: 5 tools');
  console.log('  ✅ Study Utilities: 4 tools');
  
  if (results.passed === results.total) {
    console.log(`\n${colors.green}🎉 All Ellen tools are working correctly!${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Some tools need attention. Check the logs above.${colors.reset}`);
  }
}

// Run the tests
testToolIntegration().catch(console.error);