#!/usr/bin/env tsx
/**
 * Direct Chat Testing Script
 * Tests chat functionality with proper authentication
 */

const API_BASE = 'http://localhost:3002';
const API_KEY = 'mookti-preview-key-2025';

// Test regular chat
async function testRegularChat() {
  console.log('\n📝 Testing regular chat endpoint...\n');
  
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: 'Explain photosynthesis in simple terms' }
      ]
    })
  });

  if (response.ok) {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    console.log('✅ Chat response streaming:');
    console.log('----------------------------');
    
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      process.stdout.write(chunk);
    }
    
    console.log('\n----------------------------');
    console.log('✅ Regular chat working!\n');
  } else {
    console.log('❌ Chat failed:', response.status, await response.text());
  }
}

// Test Ellen session
async function testEllenSession() {
  console.log('\n🎓 Testing Ellen pedagogical session...\n');
  
  // Create session
  const sessionResponse = await fetch(`${API_BASE}/api/ellen/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({
      userId: 'test-user-' + Date.now(),
      type: 'study',
      title: 'Learning about photosynthesis',
      sessionGoal: {
        type: 'exploration',
        description: 'Understanding how plants make food'
      }
    })
  });

  if (!sessionResponse.ok) {
    console.log('❌ Failed to create session:', await sessionResponse.text());
    return;
  }

  const session = await sessionResponse.json();
  console.log('✅ Created Ellen session:', (session as any).id);
  
  // Send message to Ellen
  const chatResponse = await fetch(`${API_BASE}/api/ellen/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({
      sessionId: (session as any).id,
      message: 'I want to understand photosynthesis. Can you help me learn using the Socratic method?',
      context: {
        userId: (session as any).userId
      }
    })
  });

  if (chatResponse.ok) {
    const result = await chatResponse.json();
    console.log('\n📚 Ellen\'s response:');
    console.log('----------------------------');
    console.log((result as any).response);
    console.log('----------------------------');
    console.log('\nTools used:', (result as any).toolsUsed);
    console.log('Query type:', (result as any).queryType);
    console.log('Session updated:', (result as any).sessionUpdated);
    console.log('\n✅ Ellen pedagogical system working!');
  } else {
    console.log('❌ Ellen chat failed:', await chatResponse.text());
  }

  // Complete the session
  const completeResponse = await fetch(`${API_BASE}/api/ellen/sessions/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({
      sessionId: (session as any).id,
      keyTakeaways: ['Photosynthesis converts light to chemical energy'],
      understandingRating: 4
    })
  });

  if (completeResponse.ok) {
    console.log('\n✅ Session completed successfully');
  }
}

// Test chat-v2 with provider selection
async function testChatV2() {
  console.log('\n🤖 Testing multi-provider chat (chat-v2)...\n');
  
  const providers = ['anthropic', 'openai', 'google'];
  
  for (const provider of providers) {
    console.log(`\nTesting ${provider}...`);
    
    const response = await fetch(`${API_BASE}/api/chat-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: `Say "Hello from ${provider}!" and nothing else.` }
        ],
        provider,
        stream: false
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ ${provider}: ${(result as any).content}`);
    } else {
      console.log(`❌ ${provider} failed:`, response.status);
    }
  }
}

// Main test runner
async function runAllTests() {
  console.log('========================================');
  console.log('        🚀 Chat System Test Suite');
  console.log('========================================');
  
  try {
    // Test basic connectivity
    console.log('\n🔌 Checking server connectivity...');
    const health = await fetch(`${API_BASE}/api/test-providers`);
    if (health.ok) {
      const providers = await health.json();
      console.log('✅ Server is up!');
      console.log('Available providers:', Object.keys((providers as any).providers).filter(p => (providers as any).providers[p]).join(', '));
    } else {
      console.log('❌ Server health check failed');
      return;
    }

    // Run tests
    await testRegularChat();
    await testEllenSession();
    await testChatV2();
    
    console.log('\n========================================');
    console.log('        ✅ All Tests Complete!');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  }
}

// Run the tests
console.log('Starting tests in 2 seconds...');
setTimeout(runAllTests, 2000);