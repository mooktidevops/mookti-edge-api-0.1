#!/usr/bin/env tsx
"use strict";
/**
 * Comprehensive System Test
 * Tests all major components of the Mookti MVP
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const API_BASE = 'http://localhost:3002';
const TEST_USER_ID = 'test-user-' + Date.now();
const tests = [];
async function runTest(name, testFn) {
    const start = Date.now();
    console.log(chalk_1.default.yellow(`\n🧪 Testing: ${name}...`));
    try {
        const success = await testFn();
        const duration = Date.now() - start;
        tests.push({ name, success, duration });
        if (success) {
            console.log(chalk_1.default.green(`   ✅ ${name} - Passed (${duration}ms)`));
        }
        else {
            console.log(chalk_1.default.red(`   ❌ ${name} - Failed`));
        }
    }
    catch (error) {
        tests.push({ name, success: false, message: error.message });
        console.log(chalk_1.default.red(`   ❌ ${name} - Error: ${error.message}`));
    }
}
// Test 1: API Health Check
async function testAPIHealth() {
    const response = await fetch(`${API_BASE}/api/test-providers`);
    const data = await response.json();
    return response.ok && data.providers;
}
// Test 2: Chat Endpoint
async function testChatEndpoint() {
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
async function testEllenSessionCreation() {
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
        global.testSessionId = session.id;
        console.log(`   Created session: ${session.id}`);
    }
    return response.ok;
}
// Test 4: Ellen Chat
async function testEllenChat() {
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
async function testSessionRetrieval() {
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
async function testSessionUpdate() {
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
async function testSessionCompletion() {
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
async function testGrowthCompassData() {
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
async function testWebAppHealth() {
    try {
        const response = await fetch('http://localhost:3003');
        return response.ok;
    }
    catch (error) {
        console.log('   Web app may not be running on port 3003');
        return false;
    }
}
// Main test runner
async function runAllTests() {
    console.log(chalk_1.default.cyan('\n==========================================='));
    console.log(chalk_1.default.cyan('   🚀 Mookti MVP Comprehensive Test Suite'));
    console.log(chalk_1.default.cyan('==========================================='));
    console.log(chalk_1.default.gray('\nAPI Server: ' + API_BASE));
    console.log(chalk_1.default.gray('Test User: ' + TEST_USER_ID));
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
    console.log(chalk_1.default.cyan('\n==========================================='));
    console.log(chalk_1.default.cyan('                Test Summary'));
    console.log(chalk_1.default.cyan('===========================================\n'));
    const passed = tests.filter(t => t.success).length;
    const failed = tests.filter(t => !t.success).length;
    const totalDuration = tests.reduce((sum, t) => sum + (t.duration || 0), 0);
    console.log(`Total Tests: ${tests.length}`);
    console.log(chalk_1.default.green(`Passed: ${passed}`));
    console.log(chalk_1.default.red(`Failed: ${failed}`));
    console.log(`Total Duration: ${totalDuration}ms`);
    if (passed === tests.length) {
        console.log(chalk_1.default.green('\n🎉 All tests passed! System is ready for use.'));
    }
    else {
        console.log(chalk_1.default.yellow('\n⚠️  Some tests failed. Please review the errors above.'));
        console.log('\nFailed tests:');
        tests.filter(t => !t.success).forEach(t => {
            console.log(chalk_1.default.red(`  - ${t.name}${t.message ? ': ' + t.message : ''}`));
        });
    }
    console.log(chalk_1.default.cyan('\n===========================================\n'));
}
// Run the tests
runAllTests().catch(console.error);
