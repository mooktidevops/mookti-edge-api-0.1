#!/usr/bin/env node

/**
 * Pattern Recognition System Test
 * Tests the Growth Compass pattern detection and analysis
 */

const API_URL = 'http://localhost:3005';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Pattern scenarios to test
const PATTERN_SCENARIOS = [
  {
    name: 'Morning Learner Pattern',
    description: 'Consistent morning study sessions',
    sessions: [
      { time: '08:00', duration: 45, quality: 'high', tool: 'socratic_tool' },
      { time: '08:30', duration: 50, quality: 'high', tool: 'reflection_tool' },
      { time: '09:00', duration: 40, quality: 'medium', tool: 'retrieval' },
      { time: '08:15', duration: 55, quality: 'high', tool: 'plan_manager' },
      { time: '08:45', duration: 35, quality: 'high', tool: 'socratic_tool' }
    ],
    expectedPatterns: ['morning_focused', 'consistent_timing', 'optimal_duration']
  },
  {
    name: 'Deep Dive Pattern',
    description: 'Extended focused sessions with depth',
    sessions: [
      { time: '14:00', duration: 90, quality: 'high', tool: 'socratic_tool', depth: 'deep' },
      { time: '15:00', duration: 120, quality: 'high', tool: 'genealogy_tool', depth: 'deep' },
      { time: '13:30', duration: 85, quality: 'medium', tool: 'extension_tool', depth: 'deep' },
      { time: '14:30', duration: 95, quality: 'high', tool: 'writing_coach', depth: 'deep' }
    ],
    expectedPatterns: ['deep_focus', 'extended_sessions', 'conceptual_exploration']
  },
  {
    name: 'Retrieval Practice Pattern',
    description: 'Regular self-testing and practice',
    sessions: [
      { time: '19:00', duration: 30, quality: 'high', tool: 'retrieval', type: 'practice' },
      { time: '19:30', duration: 25, quality: 'medium', tool: 'flashcard_generator', type: 'practice' },
      { time: '20:00', duration: 35, quality: 'high', tool: 'retrieval', type: 'practice' },
      { time: '19:15', duration: 30, quality: 'high', tool: 'retrieval', type: 'practice' }
    ],
    expectedPatterns: ['retrieval_practice', 'spaced_repetition', 'evening_review']
  },
  {
    name: 'Varied Strategy Pattern',
    description: 'Uses multiple learning strategies',
    sessions: [
      { time: '10:00', duration: 45, quality: 'high', tool: 'socratic_tool' },
      { time: '11:00', duration: 40, quality: 'high', tool: 'note_assistant' },
      { time: '14:00', duration: 50, quality: 'medium', tool: 'concept_mapper' },
      { time: '16:00', duration: 45, quality: 'high', tool: 'retrieval' },
      { time: '18:00', duration: 35, quality: 'high', tool: 'reflection_tool' }
    ],
    expectedPatterns: ['strategy_variety', 'distributed_practice', 'multimodal_learning']
  },
  {
    name: 'Struggle and Recovery Pattern',
    description: 'Shows persistence through difficulty',
    sessions: [
      { time: '10:00', duration: 60, quality: 'low', frustration: 'high' },
      { time: '10:30', duration: 30, quality: 'medium', tool: 'reflection_tool' },
      { time: '14:00', duration: 45, quality: 'high', tool: 'socratic_tool' },
      { time: '15:00', duration: 50, quality: 'high', tool: 'extension_tool' }
    ],
    expectedPatterns: ['resilience', 'adaptive_recovery', 'growth_mindset']
  }
];

async function simulateSession(userId, sessionData, sessionNum) {
  const sessionId = `pattern-test-${Date.now()}-${sessionNum}`;
  
  try {
    // Simulate session with Ellen
    const chatResponse = await fetch(`${API_URL}/api/ellen/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Help me understand this concept better',
        toolOverride: sessionData.tool,
        context: {
          userId: userId,
          sessionId: sessionId,
          sessionType: sessionData.type || 'study',
          sessionGoal: sessionData.depth === 'deep' ? 'deep_understanding' : 'practice'
        }
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!chatResponse.ok) {
      return { success: false, error: 'Chat failed' };
    }
    
    // Complete session with metrics
    const completeResponse = await fetch(`${API_URL}/api/ellen/sessions/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId,
        userId: userId,
        summary: 'Pattern test session',
        actualDuration: sessionData.duration,
        qualityScore: sessionData.quality === 'high' ? 4 : sessionData.quality === 'medium' ? 3 : 2,
        emotionalState: sessionData.frustration === 'high' ? 'frustrated' : 'engaged',
        perceivedDifficulty: sessionData.depth === 'deep' ? 4 : 3
      }),
      signal: AbortSignal.timeout(5000)
    });
    
    if (completeResponse.ok) {
      const data = await completeResponse.json();
      return {
        success: true,
        patterns: data.growthCompass?.patternsDetected || []
      };
    }
    
    return { success: false, error: 'Complete failed' };
  } catch (error) {
    console.log(`    ${colors.yellow}⚠ Session timed out or failed${colors.reset}`);
    return { success: false, error: error.message };
  }
}

async function testPatternScenario(scenario) {
  console.log(`\n${colors.cyan}Testing: ${scenario.name}${colors.reset}`);
  console.log(`Description: ${scenario.description}`);
  console.log(`Expected patterns: ${scenario.expectedPatterns.join(', ')}`);
  
  const userId = `pattern-user-${Date.now()}`;
  const detectedPatterns = new Set();
  let successfulSessions = 0;
  
  console.log('\nSimulating sessions:');
  for (let i = 0; i < scenario.sessions.length; i++) {
    const session = scenario.sessions[i];
    console.log(`  ${i + 1}. Session at ${session.time} (${session.duration}min, ${session.quality} quality)`);
    
    const result = await simulateSession(userId, session, i);
    if (result.success) {
      successfulSessions++;
      if (result.patterns) {
        result.patterns.forEach(p => detectedPatterns.add(p));
      }
    }
    
    // Small delay between sessions
    await new Promise(r => setTimeout(r, 100));
  }
  
  // Check Growth Compass for accumulated patterns
  try {
    const compassResponse = await fetch(`${API_URL}/api/growth-compass/${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (compassResponse.ok) {
      const compass = await compassResponse.json();
      if (compass.patterns) {
        compass.patterns.forEach(p => detectedPatterns.add(p.type || p));
      }
    }
  } catch (error) {
    console.log(`  ${colors.yellow}Could not fetch Growth Compass${colors.reset}`);
  }
  
  // Analyze results
  const patternsArray = Array.from(detectedPatterns);
  const expectedFound = scenario.expectedPatterns.filter(p => 
    patternsArray.some(detected => detected.includes(p) || p.includes(detected))
  );
  
  console.log(`\n${colors.cyan}Results:${colors.reset}`);
  console.log(`  Successful sessions: ${successfulSessions}/${scenario.sessions.length}`);
  console.log(`  Patterns detected: ${patternsArray.length > 0 ? patternsArray.join(', ') : 'none'}`);
  console.log(`  Expected patterns found: ${expectedFound.length}/${scenario.expectedPatterns.length}`);
  
  return {
    scenario: scenario.name,
    successfulSessions,
    totalSessions: scenario.sessions.length,
    patternsDetected: patternsArray,
    expectedFound,
    expectedTotal: scenario.expectedPatterns.length,
    success: expectedFound.length > 0 || patternsArray.length > 0
  };
}

async function runPatternRecognitionTest() {
  console.log(`${colors.blue}${'='.repeat(60)}`);
  console.log('Pattern Recognition System Test');
  console.log(`${'='.repeat(60)}${colors.reset}`);
  
  // Check API availability
  try {
    const health = await fetch(`${API_URL}/api/ellen/chat`, {
      signal: AbortSignal.timeout(3000)
    });
    if (!health.ok && health.status !== 405) {
      throw new Error('API not responding');
    }
  } catch (error) {
    console.log(`${colors.red}Error: Ellen API is not running on ${API_URL}${colors.reset}`);
    console.log('Please start the API with: npx vercel dev --listen 3005');
    process.exit(1);
  }
  
  const results = [];
  
  // Test each pattern scenario
  for (const scenario of PATTERN_SCENARIOS) {
    const result = await testPatternScenario(scenario);
    results.push(result);
    
    // Delay between scenarios
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Summary
  console.log(`\n${colors.blue}${'='.repeat(60)}`);
  console.log('Pattern Recognition Test Summary');
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
  
  const successCount = results.filter(r => r.success).length;
  const totalPatterns = results.reduce((sum, r) => sum + r.patternsDetected.length, 0);
  const expectedMatches = results.reduce((sum, r) => sum + r.expectedFound.length, 0);
  const totalExpected = results.reduce((sum, r) => sum + r.expectedTotal, 0);
  
  console.log(`${colors.cyan}Overall Results:${colors.reset}`);
  console.log(`  Scenarios tested: ${results.length}`);
  console.log(`  Successful scenarios: ${successCount}/${results.length}`);
  console.log(`  Total patterns detected: ${totalPatterns}`);
  console.log(`  Expected patterns matched: ${expectedMatches}/${totalExpected}`);
  
  // All unique patterns detected
  const allPatterns = new Set();
  results.forEach(r => {
    r.patternsDetected.forEach(p => allPatterns.add(p));
  });
  
  if (allPatterns.size > 0) {
    console.log(`\n${colors.cyan}All Patterns Detected:${colors.reset}`);
    Array.from(allPatterns).forEach(p => {
      console.log(`  📊 ${p}`);
    });
  }
  
  // Detailed results
  console.log(`\n${colors.cyan}Scenario Results:${colors.reset}`);
  results.forEach(r => {
    const status = r.expectedFound.length > 0 ? colors.green + '✓' : 
                   r.patternsDetected.length > 0 ? colors.yellow + '⚠' : 
                   colors.red + '✗';
    console.log(`  ${status} ${r.scenario}${colors.reset}`);
    console.log(`    Sessions: ${r.successfulSessions}/${r.totalSessions} successful`);
    console.log(`    Patterns: ${r.patternsDetected.length} detected, ${r.expectedFound.length}/${r.expectedTotal} expected`);
  });
  
  // System assessment
  console.log(`\n${colors.cyan}System Assessment:${colors.reset}`);
  const checks = {
    'Pattern detection works': totalPatterns > 0,
    'Multiple pattern types': allPatterns.size >= 3,
    'Scenarios trigger patterns': successCount >= results.length * 0.5,
    'Expected patterns found': expectedMatches >= totalExpected * 0.3
  };
  
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`  ${passed ? colors.green + '✓' : colors.red + '✗'} ${check}${colors.reset}`);
  });
  
  const passedChecks = Object.values(checks).filter(c => c).length;
  if (passedChecks === 4) {
    console.log(`\n${colors.green}🎉 Pattern recognition system working excellently!${colors.reset}`);
  } else if (passedChecks >= 3) {
    console.log(`\n${colors.green}✓ Pattern recognition system working well${colors.reset}`);
  } else if (passedChecks >= 2) {
    console.log(`\n${colors.yellow}⚠️ Pattern recognition system partially working${colors.reset}`);
  } else {
    console.log(`\n${colors.red}⚠️ Pattern recognition system needs attention${colors.reset}`);
  }
}

// Run the test
runPatternRecognitionTest().catch(console.error);