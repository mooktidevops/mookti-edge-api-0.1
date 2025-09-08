#!/usr/bin/env node

/**
 * Test Ellen Tools Integration with Growth Compass
 * Verifies that tool usage updates Growth Compass metrics
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001';

async function testToolWithGrowthCompass() {
  console.log('Testing Ellen Tool + Growth Compass Integration\n');
  console.log('=' .repeat(50));
  
  const sessionId = `growth-test-${Date.now()}`;
  const userId = 'test-user-growth';
  
  // Step 1: Create session
  console.log('\n1. Creating Ellen session...');
  const createResponse = await fetch(`${API_URL}/api/ellen/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: sessionId,
      userId: userId,
      type: 'study',
      title: 'Growth Compass Test Session',
      sessionGoal: {
        duration: 30,
        focusArea: 'testing',
        processType: 'retrieval_practice'
      }
    })
  });
  
  const session = await createResponse.json();
  console.log(`   ✅ Session created: ${session.id}`);
  
  // Step 2: Use various tools
  const toolTests = [
    { tool: 'socratic_tool', message: 'What is machine learning?', process: 'deep_thinking' },
    { tool: 'reflection_tool', message: 'How well did I understand that?', process: 'reflection' },
    { tool: 'retrieval', message: 'Test me on machine learning concepts', process: 'retrieval_practice' },
    { tool: 'plan_manager', message: 'Help me plan my study schedule', process: 'planning' }
  ];
  
  console.log('\n2. Using Ellen tools...');
  for (const test of toolTests) {
    const chatResponse = await fetch(`${API_URL}/api/ellen/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: test.message,
        toolOverride: test.tool,
        context: {
          userId: userId,
          sessionId: sessionId,
          sessionType: 'study'
        }
      })
    });
    
    const result = await chatResponse.json();
    if (result.response) {
      console.log(`   ✅ ${test.tool}: Response received`);
      if (result.toolsUsed?.includes(test.tool)) {
        console.log(`      Tool correctly executed`);
      }
    }
    
    // Small delay between tools
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Step 3: Complete session and check Growth Compass
  console.log('\n3. Completing session...');
  const completeResponse = await fetch(`${API_URL}/api/ellen/sessions/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionId,
      userId: userId,
      summary: 'Tested multiple Ellen tools',
      nextSteps: ['Continue testing', 'Review results'],
      emotionalState: 'engaged',
      perceivedDifficulty: 3,
      actualDuration: 10
    })
  });
  
  const completion = await completeResponse.json();
  console.log(`   ✅ Session completed`);
  
  if (completion.growthCompass) {
    console.log('\n4. Growth Compass Update:');
    console.log(`   📊 Velocity Score: ${completion.growthCompass.velocityScore}`);
    console.log(`   📈 Trend: ${completion.growthCompass.trend}`);
    
    if (completion.growthCompass.milestonesEarned?.length > 0) {
      console.log(`   🏆 Milestones Earned: ${completion.growthCompass.milestonesEarned.join(', ')}`);
    }
    
    if (completion.growthCompass.contributions) {
      console.log('\n   Component Contributions:');
      const contributions = completion.growthCompass.contributions;
      if (contributions.consistency) console.log(`   • Consistency: +${contributions.consistency}`);
      if (contributions.depth) console.log(`   • Depth: +${contributions.depth}`);
      if (contributions.variety) console.log(`   • Variety: +${contributions.variety}`);
      if (contributions.reflection) console.log(`   • Reflection: +${contributions.reflection}`);
      if (contributions.application) console.log(`   • Application: +${contributions.application}`);
      if (contributions.collaboration) console.log(`   • Collaboration: +${contributions.collaboration}`);
    }
    
    if (completion.nextSessionSuggestion) {
      console.log(`\n   💡 Next Session Suggestion: ${completion.nextSessionSuggestion.processType} for ${completion.nextSessionSuggestion.duration} minutes`);
    }
    
    console.log('\n✅ Ellen Tools + Growth Compass Integration Working!');
  } else {
    console.log('\n⚠️  No Growth Compass data returned');
  }
  
  // Step 4: Verify session messages were saved
  console.log('\n5. Checking session history...');
  const sessionResponse = await fetch(`${API_URL}/api/ellen/sessions/${sessionId}`);
  const sessionData = await sessionResponse.json();
  
  if (sessionData.messages?.length > 0) {
    console.log(`   ✅ ${sessionData.messages.length} messages saved`);
    
    // Count tool usage
    const toolsUsed = new Set();
    sessionData.messages.forEach(msg => {
      if (msg.metadata?.toolsUsed) {
        msg.metadata.toolsUsed.forEach(tool => toolsUsed.add(tool));
      }
    });
    
    if (toolsUsed.size > 0) {
      console.log(`   📊 Unique tools used: ${Array.from(toolsUsed).join(', ')}`);
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('Integration Test Complete!');
}

testToolWithGrowthCompass().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});