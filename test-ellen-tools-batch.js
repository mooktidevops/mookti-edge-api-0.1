#!/usr/bin/env node

/**
 * Ellen Tools Batch Test Suite
 * Tests tools in small batches to avoid timeouts
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001';

// Split tools into batches
const TOOL_BATCHES = {
  batch1_core: {
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
    }
  },
  
  batch2_coaching: {
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
    }
  },
  
  batch3_planning: {
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
    learning_diagnostic: {
      message: "I keep forgetting what I study. What's wrong with my approach?",
      toolOverride: "learning_diagnostic",
      expectedPatterns: ["retrieval", "practice", "spaced"]
    },
    strategy_selector: {
      message: "What's the best study strategy for memorizing vocabulary?",
      toolOverride: "strategy_selector",
      expectedPatterns: ["retrieval practice", "spaced repetition", "flashcard"]
    }
  },
  
  batch4_utilities: {
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
    flashcard_generator: {
      message: "Create flashcards for the parts of a cell",
      toolOverride: "flashcard_generator",
      expectedPatterns: ["front:", "back:", "cell"]
    },
    concept_mapper: {
      message: "Help me create a concept map for the water cycle",
      toolOverride: "concept_mapper",
      expectedPatterns: ["connect", "relationship", "evaporation"]
    }
  }
};

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function testTool(toolName, config) {
  try {
    const response = await fetch(`${API_URL}/api/ellen/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: config.message,
        toolOverride: config.toolOverride,
        context: {
          userId: 'test-user-tools',
          sessionId: `test-${toolName}-${Date.now()}`
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.response?.toLowerCase() || '';
    const foundPatterns = config.expectedPatterns.filter(p => 
      responseText.includes(p.toLowerCase())
    );
    
    if (foundPatterns.length > 0) {
      console.log(`  ${colors.green}✓ ${toolName}${colors.reset} - found: ${foundPatterns.join(', ')}`);
      return true;
    } else {
      console.log(`  ${colors.yellow}⚠ ${toolName}${colors.reset} - missing patterns`);
      return false;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗ ${toolName}${colors.reset} - ${error.message}`);
    return false;
  }
}

async function testBatch(batchName, tools) {
  console.log(`\n${colors.cyan}Testing ${batchName}...${colors.reset}`);
  
  let passed = 0;
  const total = Object.keys(tools).length;
  
  for (const [toolName, config] of Object.entries(tools)) {
    if (await testTool(toolName, config)) passed++;
    // Small delay between tests
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`${colors.blue}Batch result: ${passed}/${total} passed${colors.reset}`);
  return { passed, total };
}

async function runBatchTests(selectedBatch) {
  console.log(`${colors.blue}${'='.repeat(50)}`);
  console.log('Ellen Tools Batch Test Suite');
  console.log(`${'='.repeat(50)}${colors.reset}`);
  
  // Check API
  try {
    const health = await fetch(`${API_URL}/api/ellen/chat`);
    if (!health.ok && health.status !== 405) {
      throw new Error('API not responding');
    }
  } catch (error) {
    console.log(`${colors.red}Error: Ellen API is not running on ${API_URL}${colors.reset}`);
    process.exit(1);
  }
  
  const results = { passed: 0, total: 0 };
  
  // Run specific batch or all
  if (selectedBatch && TOOL_BATCHES[selectedBatch]) {
    const batch = await testBatch(selectedBatch, TOOL_BATCHES[selectedBatch]);
    results.passed += batch.passed;
    results.total += batch.total;
  } else {
    for (const [batchName, tools] of Object.entries(TOOL_BATCHES)) {
      const batch = await testBatch(batchName, tools);
      results.passed += batch.passed;
      results.total += batch.total;
    }
  }
  
  // Summary
  console.log(`\n${colors.blue}${'='.repeat(50)}`);
  console.log('Test Summary');
  console.log(`${'='.repeat(50)}${colors.reset}\n`);
  
  console.log(`Total Tools Tested: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  if (results.total - results.passed > 0) {
    console.log(`${colors.red}Failed: ${results.total - results.passed}${colors.reset}`);
  }
  
  const percentage = Math.round((results.passed / results.total) * 100);
  const status = percentage === 100 ? colors.green : percentage >= 80 ? colors.yellow : colors.red;
  console.log(`${status}Success Rate: ${percentage}%${colors.reset}`);
  
  if (results.passed === results.total) {
    console.log(`\n${colors.green}🎉 All tested tools are working!${colors.reset}`);
  }
}

// Get batch from command line
const batch = process.argv[2];
if (batch && !TOOL_BATCHES[batch]) {
  console.log('Available batches:');
  Object.keys(TOOL_BATCHES).forEach(b => console.log(`  - ${b}`));
  console.log('\nUsage: node test-ellen-tools-batch.js [batch_name]');
  process.exit(0);
}

runBatchTests(batch).catch(console.error);