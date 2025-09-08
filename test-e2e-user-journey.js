#!/usr/bin/env node

/**
 * End-to-End User Journey Test
 * Simulates a complete learning session with Ellen
 */

// Use native fetch (available in Node.js 18+)
// If running on older Node.js, install node-fetch as a direct dependency

const API_URL = 'http://localhost:3005';

// Simulate a realistic user learning journey
const USER_JOURNEY = {
  userId: 'journey-test-user',
  sessionId: `journey-${Date.now()}`,
  
  steps: [
    {
      name: 'Initial Question',
      message: 'I need to learn about photosynthesis for my biology exam',
      expectedTool: 'socratic_tool',
      processType: 'deep_thinking'
    },
    {
      name: 'Clarification',
      message: 'Can you explain the light and dark reactions in more detail?',
      expectedTool: 'extension_tool',
      processType: 'elaboration'
    },
    {
      name: 'Self-Testing',
      message: 'Test me on what I just learned about photosynthesis',
      expectedTool: 'retrieval',
      processType: 'retrieval_practice'
    },
    {
      name: 'Reflection',
      message: 'How well did I understand the concepts? I feel like I get the light reactions but the Calvin cycle is confusing',
      expectedTool: 'reflection_tool',
      processType: 'reflection'
    },
    {
      name: 'Study Planning',
      message: 'Help me create a study plan for the next 3 days before my exam',
      expectedTool: 'plan_manager',
      processType: 'planning'
    },
    {
      name: 'Note Strategy',
      message: 'What\'s the best way to organize my notes on this topic?',
      expectedTool: 'note_assistant',
      processType: 'organization'
    },
    {
      name: 'Creating Study Materials',
      message: 'Create flashcards for the key terms in photosynthesis',
      expectedTool: 'flashcard_generator',
      processType: 'active_recall'
    },
    {
      name: 'Concept Connections',
      message: 'Help me create a concept map showing how photosynthesis relates to cellular respiration',
      expectedTool: 'concept_mapper',
      processType: 'synthesis'
    }
  ]
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

async function executeStep(step, index, sessionId, userId) {
  console.log(`\n${colors.cyan}Step ${index + 1}: ${step.name}${colors.reset}`);
  console.log(`Message: "${step.message.substring(0, 60)}..."`);
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${API_URL}/api/ellen/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: step.message,
        context: {
          userId: userId,
          sessionId: sessionId,
          sessionType: 'study',
          learningGoal: 'Understanding photosynthesis for biology exam'
        }
      })
    });
    
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check response quality
    const checks = {
      hasResponse: !!data.response,
      responseLength: data.response?.length > 100,
      toolsUsed: data.toolsUsed?.length > 0,
      expectedToolUsed: data.toolsUsed?.includes(step.expectedTool),
      responseTime: responseTime < 5000
    };
    
    // Display results
    console.log(`  ${checks.hasResponse ? colors.green + '✓' : colors.red + '✗'} Response received`);
    console.log(`  ${checks.responseLength ? colors.green + '✓' : colors.yellow + '⚠'} Response length: ${data.response?.length || 0} chars`);
    console.log(`  ${checks.toolsUsed ? colors.green + '✓' : colors.yellow + '⚠'} Tools used: ${data.toolsUsed?.join(', ') || 'none'}`);
    
    if (step.expectedTool) {
      console.log(`  ${checks.expectedToolUsed ? colors.green + '✓' : colors.yellow + '⚠'} Expected tool (${step.expectedTool}): ${checks.expectedToolUsed ? 'used' : 'not used'}`);
    }
    
    console.log(`  ${checks.responseTime ? colors.green + '✓' : colors.yellow + '⚠'} Response time: ${responseTime}ms`);
    
    // Extract sample from response
    if (data.response) {
      const preview = data.response.substring(0, 150).replace(/\n/g, ' ');
      console.log(`  ${colors.blue}Preview: "${preview}..."${colors.reset}`);
    }
    
    // Calculate step score
    const score = Object.values(checks).filter(c => c).length / Object.keys(checks).length;
    
    return {
      step: step.name,
      success: checks.hasResponse,
      score: score,
      responseTime: responseTime,
      toolsUsed: data.toolsUsed || [],
      checks: checks
    };
    
  } catch (error) {
    console.log(`  ${colors.red}✗ Error: ${error.message}${colors.reset}`);
    return {
      step: step.name,
      success: false,
      score: 0,
      error: error.message
    };
  }
}

async function runUserJourney() {
  console.log(`${colors.blue}${'='.repeat(60)}`);
  console.log('End-to-End User Journey Test');
  console.log('Simulating Complete Learning Session');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
  
  // Check API availability
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
  
  console.log(`${colors.magenta}Journey Configuration:${colors.reset}`);
  console.log(`  User ID: ${USER_JOURNEY.userId}`);
  console.log(`  Session ID: ${USER_JOURNEY.sessionId}`);
  console.log(`  Total Steps: ${USER_JOURNEY.steps.length}`);
  console.log(`  Learning Goal: Understanding photosynthesis\n`);
  
  const results = [];
  let totalTime = 0;
  
  // Execute each step
  for (let i = 0; i < USER_JOURNEY.steps.length; i++) {
    const step = USER_JOURNEY.steps[i];
    const result = await executeStep(
      step, 
      i, 
      USER_JOURNEY.sessionId,
      USER_JOURNEY.userId
    );
    
    results.push(result);
    totalTime += result.responseTime || 0;
    
    // Small delay between steps
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Calculate journey metrics
  const successfulSteps = results.filter(r => r.success).length;
  const averageScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;
  const averageResponseTime = totalTime / results.length;
  
  // Analyze tool usage
  const allToolsUsed = new Set();
  results.forEach(r => {
    if (r.toolsUsed) {
      r.toolsUsed.forEach(tool => allToolsUsed.add(tool));
    }
  });
  
  // Process type coverage
  const processTypes = new Set(USER_JOURNEY.steps.map(s => s.processType));
  
  // Display summary
  console.log(`\n${colors.blue}${'='.repeat(60)}`);
  console.log('Journey Summary');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
  
  console.log(`${colors.cyan}Completion Metrics:${colors.reset}`);
  console.log(`  Steps Completed: ${successfulSteps}/${USER_JOURNEY.steps.length}`);
  console.log(`  Success Rate: ${Math.round((successfulSteps / USER_JOURNEY.steps.length) * 100)}%`);
  console.log(`  Average Score: ${Math.round(averageScore * 100)}%`);
  console.log(`  Average Response Time: ${Math.round(averageResponseTime)}ms`);
  
  console.log(`\n${colors.cyan}Tool Usage:${colors.reset}`);
  console.log(`  Unique Tools Used: ${allToolsUsed.size}`);
  console.log(`  Tools: ${Array.from(allToolsUsed).join(', ')}`);
  
  console.log(`\n${colors.cyan}Process Coverage:${colors.reset}`);
  console.log(`  Process Types: ${processTypes.size}`);
  console.log(`  Types: ${Array.from(processTypes).join(', ')}`);
  
  // Quality assessment
  console.log(`\n${colors.cyan}Quality Assessment:${colors.reset}`);
  
  const qualityChecks = {
    'High Completion Rate': successfulSteps >= USER_JOURNEY.steps.length * 0.8,
    'Good Response Times': averageResponseTime < 3000,
    'Tool Diversity': allToolsUsed.size >= 5,
    'Process Coverage': processTypes.size >= 5,
    'Consistent Quality': averageScore >= 0.7
  };
  
  Object.entries(qualityChecks).forEach(([check, passed]) => {
    console.log(`  ${passed ? colors.green + '✓' : colors.red + '✗'} ${check}${colors.reset}`);
  });
  
  const passedChecks = Object.values(qualityChecks).filter(c => c).length;
  const journeyStatus = passedChecks >= 4 ? colors.green : passedChecks >= 3 ? colors.yellow : colors.red;
  
  console.log(`\n${journeyStatus}Overall Journey Status: ${passedChecks}/5 quality checks passed${colors.reset}`);
  
  if (passedChecks === 5) {
    console.log(`${colors.green}🎉 Excellent! The user journey is working perfectly!${colors.reset}`);
  } else if (passedChecks >= 3) {
    console.log(`${colors.yellow}⚠️  Good, but some areas need improvement${colors.reset}`);
  } else {
    console.log(`${colors.red}⚠️  Journey needs attention - multiple issues detected${colors.reset}`);
  }
  
  // Detailed step analysis
  console.log(`\n${colors.cyan}Step-by-Step Analysis:${colors.reset}`);
  results.forEach((result, i) => {
    const status = result.success ? colors.green + '✓' : colors.red + '✗';
    console.log(`  ${status} Step ${i + 1}: ${result.step} (${Math.round(result.score * 100)}%)${colors.reset}`);
  });
}

// Run the test
runUserJourney().catch(console.error);