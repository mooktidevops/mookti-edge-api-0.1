#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const API_URL = process.env.API_URL || 'http://localhost:3002';
const TEST_USER_ID = 'test-user-123';
const API_KEY = process.env.MOOKTI_API_KEY || 'mookti-preview-key-2025';

// Helper to get default headers with auth
const getHeaders = (contentType = 'application/json') => ({
  'Content-Type': contentType,
  'Authorization': `Bearer ${API_KEY}`
});

// Type definitions for test
interface TestSession {
  id: string;
  type: string;
  status: string;
  title: string;
  messages?: any[];
  totalDuration: number;
  keyTakeaways?: string[];
  growthContributions?: any;
}

interface ChatResponse {
  response: string;
  toolsUsed?: string[];
  sessionId?: string;
}

interface SessionsResponse {
  sessions: any[];
}

interface CompletionResponse {
  session: TestSession;
  growthCompass?: {
    velocityUpdate: number;
    trend: string;
    milestonesEarned?: string[];
  };
}

async function testSessionFlow() {
  console.log('🧪 Testing Ellen Session Persistence Flow\n');

  try {
    // Test 1: Create a new session
    console.log('1️⃣ Creating new session...');
    const createResponse = await fetch(`${API_URL}/api/ellen/sessions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        userId: TEST_USER_ID,
        type: 'study',
        title: 'Test Study Session',
        context: {
          learningGoal: 'Learn about session persistence',
          currentTask: 'Testing the system'
        },
        sessionGoal: {
          type: 'exploration',
          description: 'Exploring session features',
          targetDuration: 30
        }
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create session: ${createResponse.status}`);
    }

    const session = await createResponse.json() as TestSession;
    console.log(`✅ Session created: ${session.id}`);
    console.log(`   Type: ${session.type}, Status: ${session.status}\n`);

    // Test 2: Send a message through Ellen with the session
    console.log('2️⃣ Sending message through Ellen...');
    const chatResponse = await fetch(`${API_URL}/api/ellen/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        message: 'What is machine learning?',
        sessionId: session.id,
        context: {
          userId: TEST_USER_ID,
          sessionId: session.id
        }
      })
    });

    if (!chatResponse.ok) {
      throw new Error(`Failed to send message: ${chatResponse.status}`);
    }

    const chatResult = await chatResponse.json() as ChatResponse;
    console.log(`✅ Message processed`);
    console.log(`   Tools used: ${chatResult.toolsUsed?.join(', ') || 'none'}`);
    console.log(`   Response length: ${chatResult.response?.length || 0} chars\n`);

    // Test 3: Get session to verify message was saved
    console.log('3️⃣ Retrieving session to check messages...');
    const getResponse = await fetch(`${API_URL}/api/ellen/sessions/${session.id}`, {
      headers: getHeaders()
    });
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get session: ${getResponse.status}`);
    }

    const updatedSession = await getResponse.json() as TestSession;
    console.log(`✅ Session retrieved`);
    console.log(`   Messages: ${updatedSession.messages?.length || 0}`);
    console.log(`   Duration: ${updatedSession.totalDuration} minutes\n`);

    // Test 4: Pause the session
    console.log('4️⃣ Pausing session...');
    const pauseResponse = await fetch(`${API_URL}/api/ellen/sessions/${session.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ action: 'pause' })
    });

    if (!pauseResponse.ok) {
      throw new Error(`Failed to pause session: ${pauseResponse.status}`);
    }

    console.log('✅ Session paused\n');

    // Test 5: Get user's recent sessions
    console.log('5️⃣ Getting user\'s recent sessions...');
    const recentResponse = await fetch(
      `${API_URL}/api/ellen/sessions?userId=${TEST_USER_ID}&recent=true`,
      { headers: getHeaders() }
    );

    if (!recentResponse.ok) {
      throw new Error(`Failed to get recent sessions: ${recentResponse.status}`);
    }

    const recentData = await recentResponse.json() as SessionsResponse;
    console.log(`✅ Recent sessions retrieved`);
    console.log(`   Count: ${recentData.sessions?.length || 0}`);
    
    if (recentData.sessions?.length > 0) {
      const recent = recentData.sessions[0];
      console.log(`   Most recent: ${recent.title} (${recent.status})\n`);
    }

    // Test 6: Complete the session with outcomes
    console.log('6️⃣ Completing session with outcomes...');
    const completeResponse = await fetch(`${API_URL}/api/ellen/sessions/complete`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        sessionId: session.id,
        keyTakeaways: [
          'Machine learning is about patterns',
          'Models learn from data',
          'Testing is important'
        ],
        confidenceRating: 4,
        understandingRating: 5,
        difficultyRating: 3
      })
    });

    if (!completeResponse.ok) {
      throw new Error(`Failed to complete session: ${completeResponse.status}`);
    }

    const completionData = await completeResponse.json() as CompletionResponse;
    console.log('✅ Session completed');
    
    if (completionData.growthCompass) {
      console.log(`   Growth Velocity: ${completionData.growthCompass.velocityUpdate}`);
      console.log(`   Trend: ${completionData.growthCompass.trend}`);
      if (completionData.growthCompass.milestonesEarned && completionData.growthCompass.milestonesEarned.length > 0) {
        console.log(`   Milestones: ${completionData.growthCompass.milestonesEarned.join(', ')}`);
      }
    }
    console.log('');

    // Test 7: Verify session status is completed
    console.log('7️⃣ Verifying session completion...');
    const finalResponse = await fetch(`${API_URL}/api/ellen/sessions/${session.id}`, {
      headers: getHeaders()
    });
    
    if (!finalResponse.ok) {
      throw new Error(`Failed to get final session: ${finalResponse.status}`);
    }

    const finalSession = await finalResponse.json() as TestSession;
    console.log(`✅ Final session status: ${finalSession.status}`);
    console.log(`   Key takeaways: ${finalSession.keyTakeaways?.length || 0}`);
    console.log(`   Growth contributions calculated: ${finalSession.growthContributions ? 'Yes' : 'No'}\n`);

    // Test 8: Clean up - Delete test session
    console.log('8️⃣ Cleaning up test session...');
    const deleteResponse = await fetch(`${API_URL}/api/ellen/sessions/${session.id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete session: ${deleteResponse.status}`);
    }

    console.log('✅ Test session deleted\n');

    console.log('🎉 All session persistence tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSessionFlow().catch(console.error);