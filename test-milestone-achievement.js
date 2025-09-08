#!/usr/bin/env node

/**
 * Milestone Achievement Test
 * Tests the Growth Compass milestone system
 */

// Use native fetch (Node.js 18+)

const API_URL = 'http://localhost:3005';

// Define milestone triggers based on the system
const MILESTONE_SCENARIOS = [
  {
    name: 'Getting Started',
    milestone: 'getting_started',
    trigger: 'First session completion',
    actions: [
      { type: 'chat', message: 'What is machine learning?' },
      { type: 'chat', message: 'Can you test me on this?' }
    ]
  },
  {
    name: 'Deep Diver',
    milestone: 'deep_diver',
    trigger: '10+ depth points',
    actions: [
      { type: 'chat', message: 'Why does this work?', tool: 'socratic_tool' },
      { type: 'chat', message: 'What are the underlying principles?', tool: 'genealogy_tool' },
      { type: 'chat', message: 'How does this connect to other concepts?', tool: 'extension_tool' }
    ]
  },
  {
    name: 'Reflection Explorer',
    milestone: 'reflection_explorer',
    trigger: '5+ reflection sessions',
    actions: [
      { type: 'chat', message: 'How well did I understand that?', tool: 'reflection_tool' },
      { type: 'chat', message: 'What could I do better next time?', tool: 'reflection_tool' }
    ]
  },
  {
    name: 'Practice Champion',
    milestone: 'practice_champion',
    trigger: 'Regular retrieval practice',
    actions: [
      { type: 'chat', message: 'Test me on photosynthesis', tool: 'retrieval' },
      { type: 'chat', message: 'Quiz me on the Calvin cycle', tool: 'retrieval' },
      { type: 'chat', message: 'Create flashcards for key terms', tool: 'flashcard_generator' }
    ]
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

async function getGrowthCompass(userId) {
  try {
    const response = await fetch(`${API_URL}/api/growth-compass/user/${userId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function testMilestoneScenario(scenario) {
  console.log(`\n${colors.cyan}Testing: ${scenario.name}${colors.reset}`);
  console.log(`Milestone: ${scenario.milestone}`);
  console.log(`Trigger: ${scenario.trigger}`);
  
  const userId = `milestone-test-${scenario.milestone}-${Date.now()}`;
  const sessionId = `session-${scenario.milestone}-${Date.now()}`;
  
  // Get initial state
  const initialCompass = await getGrowthCompass(userId);
  const initialMilestones = initialCompass?.milestones || [];
  
  console.log(`Initial milestones: ${initialMilestones.length}`);
  
  // Execute actions
  console.log('\nExecuting actions:');
  for (let i = 0; i < scenario.actions.length; i++) {
    const action = scenario.actions[i];
    console.log(`  ${i + 1}. ${action.message.substring(0, 50)}...`);
    
    if (action.type === 'chat') {
      const response = await fetch(`${API_URL}/api/ellen/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: action.message,
          toolOverride: action.tool,
          context: {
            userId: userId,
            sessionId: sessionId,
            sessionType: 'study'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.growthMetrics?.sessionContribution) {
          console.log(`     Session contribution: +${data.growthMetrics.sessionContribution}`);
        }
      }
    }
    
    // Small delay
    await new Promise(r => setTimeout(r, 200));
  }
  
  // Complete session to trigger milestone check
  console.log('\nCompleting session...');
  const completeResponse = await fetch(`${API_URL}/api/ellen/sessions/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionId,
      userId: userId,
      summary: `Testing ${scenario.milestone} milestone`,
      nextSteps: ['Continue testing'],
      emotionalState: 'engaged',
      perceivedDifficulty: 3,
      actualDuration: 10
    })
  });
  
  let newMilestones = [];
  let milestonesEarned = [];
  
  if (completeResponse.ok) {
    const completion = await completeResponse.json();
    if (completion.growthCompass?.milestonesEarned) {
      milestonesEarned = completion.growthCompass.milestonesEarned;
      console.log(`${colors.green}✓ Milestones earned: ${milestonesEarned.join(', ')}${colors.reset}`);
    }
  }
  
  // Check if target milestone was earned
  const targetEarned = milestonesEarned.includes(scenario.milestone);
  
  return {
    scenario: scenario.name,
    milestone: scenario.milestone,
    earned: targetEarned,
    allEarned: milestonesEarned,
    success: targetEarned || milestonesEarned.length > 0
  };
}

async function testMilestoneSystem() {
  console.log(`${colors.blue}${'='.repeat(60)}`);
  console.log('Milestone Achievement System Test');
  console.log(`${'='.repeat(60)}${colors.reset}`);
  
  // Check API
  try {
    const health = await fetch(`${API_URL}/api/ellen/chat`);
    if (!health.ok && health.status !== 405) {
      throw new Error('API not responding');
    }
  } catch (error) {
    console.log(`${colors.red}Error: API not running${colors.reset}`);
    process.exit(1);
  }
  
  const results = [];
  
  // Test each milestone scenario
  for (const scenario of MILESTONE_SCENARIOS) {
    const result = await testMilestoneScenario(scenario);
    results.push(result);
    
    // Delay between scenarios
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Summary
  console.log(`\n${colors.blue}${'='.repeat(60)}`);
  console.log('Milestone Test Summary');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
  
  const successCount = results.filter(r => r.success).length;
  const targetCount = results.filter(r => r.earned).length;
  
  console.log(`Scenarios Tested: ${results.length}`);
  console.log(`${colors.green}Successful Triggers: ${successCount}/${results.length}${colors.reset}`);
  console.log(`Target Milestones Earned: ${targetCount}/${results.length}`);
  
  // All milestones earned across tests
  const allMilestones = new Set();
  results.forEach(r => {
    r.allEarned.forEach(m => allMilestones.add(m));
  });
  
  console.log(`\n${colors.cyan}All Milestones Triggered:${colors.reset}`);
  Array.from(allMilestones).forEach(m => {
    console.log(`  🏆 ${m}`);
  });
  
  // Detailed results
  console.log(`\n${colors.cyan}Detailed Results:${colors.reset}`);
  results.forEach(r => {
    const status = r.earned ? colors.green + '✓' : r.success ? colors.yellow + '⚠' : colors.red + '✗';
    console.log(`  ${status} ${r.scenario}: ${r.earned ? 'Target earned' : r.success ? 'Other milestones earned' : 'No milestones'}${colors.reset}`);
    if (r.allEarned.length > 0 && !r.earned) {
      console.log(`    Earned instead: ${r.allEarned.join(', ')}`);
    }
  });
  
  // System assessment
  console.log(`\n${colors.cyan}System Assessment:${colors.reset}`);
  const checks = {
    'Milestone triggers work': successCount > 0,
    'Multiple milestone types': allMilestones.size >= 2,
    'Consistent triggering': successCount >= results.length * 0.5
  };
  
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`  ${passed ? colors.green + '✓' : colors.red + '✗'} ${check}${colors.reset}`);
  });
  
  const passedChecks = Object.values(checks).filter(c => c).length;
  if (passedChecks === 3) {
    console.log(`\n${colors.green}🎉 Milestone system working well!${colors.reset}`);
  } else if (passedChecks >= 2) {
    console.log(`\n${colors.yellow}⚠️ Milestone system partially working${colors.reset}`);
  } else {
    console.log(`\n${colors.red}⚠️ Milestone system needs attention${colors.reset}`);
  }
}

// Run test
testMilestoneSystem().catch(console.error);