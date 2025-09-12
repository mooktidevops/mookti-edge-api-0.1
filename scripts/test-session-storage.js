#!/usr/bin/env ts-node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: '.env' });
const ellen_session_storage_1 = require("../lib/storage/ellen-session-storage");
const TEST_USER_ID = 'test-user-123';
async function testSessionStorage() {
    console.log('🧪 Testing EllenSessionStorage directly\n');
    const storage = new ellen_session_storage_1.EllenSessionStorage();
    try {
        // Test 1: Create a session
        console.log('1️⃣ Creating session...');
        const session = await storage.createSession({
            userId: TEST_USER_ID,
            type: 'study',
            title: 'Direct Test Session',
            context: {
                learningGoal: 'Test storage layer',
                currentTask: 'Verify functionality'
            },
            sessionGoal: {
                type: 'exploration',
                description: 'Testing session storage',
                targetDuration: 30
            }
        });
        console.log(`✅ Session created: ${session.id}`);
        console.log(`   Type: ${session.type}, Status: ${session.status}`);
        // Test 2: Add a message
        console.log('\n2️⃣ Adding message to session...');
        const message = await storage.addMessage({
            sessionId: session.id,
            role: 'user',
            content: 'What is machine learning?',
            metadata: {}
        });
        console.log(`✅ Message added: ${message.id}`);
        // Test 3: Add tool usage
        console.log('\n3️⃣ Adding assistant response with tools...');
        const assistantMessage = await storage.addMessage({
            sessionId: session.id,
            role: 'assistant',
            content: 'Machine learning is a subset of artificial intelligence...',
            metadata: {
                toolsUsed: ['SearchTool', 'SocraticTool']
            }
        });
        console.log(`✅ Assistant message added with tools: ${assistantMessage.metadata?.toolsUsed?.join(', ')}`);
        // Test 4: Get session to verify messages
        console.log('\n4️⃣ Retrieving session...');
        const retrieved = await storage.getSession(session.id);
        console.log(`✅ Session retrieved`);
        console.log(`   Messages: ${retrieved?.messages.length}`);
        console.log(`   Duration: ${retrieved?.totalDuration} minutes`);
        // Test 5: Get user's recent sessions
        console.log('\n5️⃣ Getting recent sessions...');
        const recent = await storage.getRecentSessions(TEST_USER_ID, 5);
        console.log(`✅ Found ${recent.length} recent sessions`);
        if (recent.length > 0) {
            console.log(`   Most recent: ${recent[0].title} (${recent[0].status})`);
        }
        // Test 6: Pause session
        console.log('\n6️⃣ Pausing session...');
        const paused = await storage.pauseSession(session.id);
        console.log(`✅ Session paused: ${paused}`);
        // Test 7: Complete session
        console.log('\n7️⃣ Completing session...');
        const completed = await storage.completeSession(session.id, {
            keyTakeaways: [
                'ML is about patterns',
                'Models learn from data',
                'Testing is important'
            ],
            confidenceRating: 4,
            understandingRating: 5,
            difficultyRating: 3
        });
        console.log(`✅ Session completed`);
        console.log(`   Growth contributions:`, completed?.growthContributions);
        // Test 8: Clean up
        console.log('\n8️⃣ Cleaning up...');
        const deleted = await storage.deleteSession(session.id);
        console.log(`✅ Session deleted: ${deleted}`);
        console.log('\n🎉 All storage tests passed!');
    }
    catch (error) {
        console.error('❌ Storage test failed:', error);
        process.exit(1);
    }
}
testSessionStorage().catch(console.error);
