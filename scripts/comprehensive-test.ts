#!/usr/bin/env tsx
/**
 * Comprehensive System Test
 * Tests all major components of the Mookti MVP
 */

import chalk from 'chalk';

const API_BASE = 'http://localhost:3002';
const TEST_USER_ID = 'test-user-' + Date.now();

interface TestResult {
  name: string;
  success: boolean;
  message?: string;
  duration?: number;
}

const tests: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<boolean>): Promise<void> {
  const start = Date.now();
  console.log(chalk.yellow(`\n🧪 Testing: ${name}...`));
  
  try {
    const success = await testFn();
    const duration = Date.now() - start;
    
    tests.push({ name, success, duration });
    
    if (success) {
      console.log(chalk.green(`   ✅ ${name} - Passed (${duration}ms)`));
    } else {
      console.log(chalk.red(`   ❌ ${name} - Failed`));
    }
  } catch (error: any) {
    tests.push({ name, success: false, message: error.message });
    console.log(chalk.red(`   ❌ ${name} - Error: ${error.message}`));
  }
}

// Test 1: API Health Check
async function testAPIHealth(): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/test-providers`);
  const data = await response.json();
  return response.ok && (data as any).providers;
}

// Test 2: Chat Endpoint
async function testChatEndpoint(): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-api-key': 'mookti-preview-key-2025'
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: 'Hello, can you help me learn?' }
      ]
    })
  });
  
  if (!response.ok) {
    console.log('   Chat response status:', response.status);
    const text = await response.text();
    console.log('   Response:', text.substring(0, 200));
  }
  
  return response.ok;
}

// Test 3: Ellen Session Creation
async function testEllenSessionCreation(): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/ellen/sessions`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-api-key': 'mookti-preview-key-2025'
    },
    body: JSON.stringify({
      userId: TEST_USER_ID,
      type: 'study',
      title: 'Test Session',
      sessionGoal: {
        type: 'exploration',
        description: 'Test session goal'
      }
    })
  });
  
  if (response.ok) {
    const session = await response.json();
    (global as any).testSessionId = (session as any).id;
    console.log(`   Created session: ${(session as any).id}`);
  }
  
  return response.ok;
}

// Test 4: Ellen Chat
async function testEllenChat(): Promise<boolean> {
  if (!global.testSessionId) {
    console.log('   Skipping - no session ID');
    return false;
  }
  
  const response = await fetch(`${API_BASE}/api/ellen/chat`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-api-key': 'mookti-preview-key-2025'
    },
    body: JSON.stringify({
      sessionId: global.testSessionId,
      message: 'What is photosynthesis?',
      context: {
        userId: TEST_USER_ID
      }
    })
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.log('   Ellen chat error:', text.substring(0, 200));
  }
  
  return response.ok;
}

// Test 5: Session Retrieval
async function testSessionRetrieval(): Promise<boolean> {
  if (!global.testSessionId) {
    console.log('   Skipping - no session ID');
    return false;
  }
  
  const response = await fetch(`${API_BASE}/api/ellen/sessions/${global.testSessionId}`, {
    headers: { 
      'x-api-key': 'mookti-preview-key-2025'
    }
  });
  
  return response.ok;
}

// Test 6: Session Update
async function testSessionUpdate(): Promise<boolean> {
  if (!global.testSessionId) {
    console.log('   Skipping - no session ID');
    return false;
  }
  
  const response = await fetch(`${API_BASE}/api/ellen/sessions/${global.testSessionId}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'x-api-key': 'mookti-preview-key-2025'
    },
    body: JSON.stringify({
      feedback: 'Test feedback'
    })
  });
  
  return response.ok;
}

// Test 7: Session Completion
async function testSessionCompletion(): Promise<boolean> {
  if (!global.testSessionId) {
    console.log('   Skipping - no session ID');
    return false;
  }
  
  const response = await fetch(`${API_BASE}/api/ellen/sessions/complete`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-api-key': 'mookti-preview-key-2025'
    },
    body: JSON.stringify({
      sessionId: global.testSessionId,
      keyTakeaways: ['Learned about photosynthesis'],
      understandingRating: 4
    })
  });
  
  return response.ok;
}

// Test 8: Growth Compass Data
async function testGrowthCompassData(): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/growth-compass/data`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-api-key': 'mookti-preview-key-2025'
    },
    body: JSON.stringify({
      userId: TEST_USER_ID
    })
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.log('   Growth Compass error:', text.substring(0, 200));
  }
  
  return response.ok;
}

// Test 9: Web App Health
async function testWebAppHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3003');
    return response.ok;
  } catch (error) {
    console.log('   Web app may not be running on port 3003');
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log(chalk.cyan('\n==========================================='));
  console.log(chalk.cyan('   🚀 Mookti MVP Comprehensive Test Suite'));
  console.log(chalk.cyan('==========================================='));
  
  console.log(chalk.gray('\nAPI Server: ' + API_BASE));
  console.log(chalk.gray('Test User: ' + TEST_USER_ID));
  
  // Run all tests
  await runTest('API Health Check', testAPIHealth);
  await runTest('Chat Endpoint', testChatEndpoint);
  await runTest('Ellen Session Creation', testEllenSessionCreation);
  await runTest('Ellen Chat', testEllenChat);
  await runTest('Session Retrieval', testSessionRetrieval);
  await runTest('Session Update', testSessionUpdate);
  await runTest('Session Completion', testSessionCompletion);
  await runTest('Growth Compass Data', testGrowthCompassData);
  await runTest('Web App Health', testWebAppHealth);
  
  // Print summary
  console.log(chalk.cyan('\n==========================================='));
  console.log(chalk.cyan('                Test Summary'));
  console.log(chalk.cyan('===========================================\n'));
  
  const passed = tests.filter(t => t.success).length;
  const failed = tests.filter(t => !t.success).length;
  const totalDuration = tests.reduce((sum, t) => sum + (t.duration || 0), 0);
  
  console.log(`Total Tests: ${tests.length}`);
  console.log(chalk.green(`Passed: ${passed}`));
  console.log(chalk.red(`Failed: ${failed}`));
  console.log(`Total Duration: ${totalDuration}ms`);
  
  if (passed === tests.length) {
    console.log(chalk.green('\n🎉 All tests passed! System is ready for use.'));
  } else {
    console.log(chalk.yellow('\n⚠️  Some tests failed. Please review the errors above.'));
    console.log('\nFailed tests:');
    tests.filter(t => !t.success).forEach(t => {
      console.log(chalk.red(`  - ${t.name}${t.message ? ': ' + t.message : ''}`));
    });
  }
  
  console.log(chalk.cyan('\n===========================================\n'));
}

// Add global type for test session ID
declare global {
  var testSessionId: string | undefined;
}

// Run the tests
runAllTests().catch(console.error);