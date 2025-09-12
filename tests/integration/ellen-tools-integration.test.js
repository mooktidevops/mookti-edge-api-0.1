"use strict";
/**
 * Integration Tests for Ellen Pedagogical Tools
 * Tests the full flow of Ellen's tools with the chat API
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// API endpoint configuration
const API_BASE = 'http://localhost:3002';
const TEST_CHAT_ENDPOINT = `${API_BASE}/api/test-chat`;
const ELLEN_SESSION_ENDPOINT = `${API_BASE}/api/ellen/sessions`;
// Test utilities
async function sendChatMessage(message, provider = 'openai') {
    const response = await fetch(TEST_CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messages: [
                {
                    role: 'user',
                    content: message,
                },
            ],
            provider,
            stream: false,
        }),
    });
    if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`);
    }
    return response.json();
}
async function createEllenSession(userId, sessionGoal) {
    const response = await fetch(ELLEN_SESSION_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId,
            sessionGoal,
            currentNodeId: 'intro-001',
            moduleProgress: {
                currentModule: 'workplace-success',
                nodesCompleted: 0,
                totalNodes: 25,
            },
        }),
    });
    if (!response.ok) {
        throw new Error(`Ellen session API error: ${response.status}`);
    }
    return response.json();
}
(0, globals_1.describe)('Ellen Pedagogical Tools Integration', () => {
    let sessionId;
    const testUserId = 'test-user-' + Date.now();
    (0, globals_1.beforeAll)(async () => {
        // Create a test Ellen session
        const session = await createEllenSession(testUserId, 'Master workplace communication');
        sessionId = session.sessionId;
    });
    (0, globals_1.describe)('Socratic Questioning', () => {
        (0, globals_1.test)('should engage with productive confusion', async () => {
            const response = await sendChatMessage("I don't understand why active listening is important in meetings");
            (0, globals_1.expect)(response.content).toBeDefined();
            (0, globals_1.expect)(response.content.toLowerCase()).toMatch(/active listening|understanding|communication/i);
        });
        (0, globals_1.test)('should use clarifying questions', async () => {
            const response = await sendChatMessage("How do I handle difficult conversations?");
            (0, globals_1.expect)(response.content).toBeDefined();
            // Should provide answer followed by a question
            (0, globals_1.expect)(response.content).toMatch(/\?/);
        });
        (0, globals_1.test)('should recognize aporia moments', async () => {
            const response = await sendChatMessage("I'm confused about when to be assertive versus collaborative");
            (0, globals_1.expect)(response.content).toBeDefined();
            // Should acknowledge the productive confusion
            (0, globals_1.expect)(response.content.toLowerCase()).toMatch(/balance|both|depends|context|situation/i);
        });
    });
    (0, globals_1.describe)('Reflection Tools', () => {
        (0, globals_1.test)('should support metacognitive reflection', async () => {
            const response = await sendChatMessage("I noticed I tend to interrupt people when I'm excited about an idea");
            (0, globals_1.expect)(response.content).toBeDefined();
            // Should validate the self-awareness
            (0, globals_1.expect)(response.content.toLowerCase()).toMatch(/awareness|notice|recognize|insight/i);
        });
        (0, globals_1.test)('should guide pattern recognition', async () => {
            const response = await sendChatMessage("I keep having the same conflict with my manager about deadlines");
            (0, globals_1.expect)(response.content).toBeDefined();
            // Should help identify patterns
            (0, globals_1.expect)(response.content.toLowerCase()).toMatch(/pattern|recurring|tends to|often|usually/i);
        });
    });
    (0, globals_1.describe)('Study Utilities', () => {
        (0, globals_1.test)('should generate practice scenarios', async () => {
            const response = await sendChatMessage("Can you give me a practice scenario for giving feedback?");
            (0, globals_1.expect)(response.content).toBeDefined();
            // Should include scenario elements
            (0, globals_1.expect)(response.content.toLowerCase()).toMatch(/scenario|imagine|suppose|situation|example/i);
        });
        (0, globals_1.test)('should provide retrieval practice', async () => {
            const response = await sendChatMessage("Test me on the key principles of effective communication");
            (0, globals_1.expect)(response.content).toBeDefined();
            // Should include testing elements
            (0, globals_1.expect)(response.content.toLowerCase()).toMatch(/recall|remember|what|explain|describe/i);
        });
        (0, globals_1.test)('should offer spaced repetition guidance', async () => {
            const response = await sendChatMessage("How should I review what I've learned about conflict resolution?");
            (0, globals_1.expect)(response.content).toBeDefined();
            // Should mention review strategies
            (0, globals_1.expect)(response.content.toLowerCase()).toMatch(/review|practice|revisit|reinforce|space/i);
        });
    });
    (0, globals_1.describe)('Multi-Provider Support', () => {
        (0, globals_1.test)('should work with OpenAI', async () => {
            const response = await sendChatMessage("What's the most important communication skill?", 'openai');
            (0, globals_1.expect)(response.content).toBeDefined();
            (0, globals_1.expect)(response.provider).toBe('openai');
        });
        (0, globals_1.test)('should work with Anthropic', async () => {
            const response = await sendChatMessage("What's the most important communication skill?", 'anthropic');
            (0, globals_1.expect)(response.content).toBeDefined();
            (0, globals_1.expect)(response.provider).toBe('anthropic');
        });
        (0, globals_1.test)('should work with Google', async () => {
            const response = await sendChatMessage("What's the most important communication skill?", 'google');
            (0, globals_1.expect)(response.content).toBeDefined();
            (0, globals_1.expect)(response.provider).toBe('google');
        });
    });
    (0, globals_1.describe)('Growth Compass Integration', () => {
        (0, globals_1.test)('should track conceptual understanding', async () => {
            const response = await sendChatMessage("I finally understand how empathy and assertiveness work together!");
            (0, globals_1.expect)(response.content).toBeDefined();
            // Should acknowledge the breakthrough
            (0, globals_1.expect)(response.content.toLowerCase()).toMatch(/understand|insight|connection|breakthrough|excellent/i);
        });
        (0, globals_1.test)('should recognize skill application', async () => {
            const response = await sendChatMessage("I used the STAR method in my interview today and it went great!");
            (0, globals_1.expect)(response.content).toBeDefined();
            // Should celebrate application
            (0, globals_1.expect)(response.content.toLowerCase()).toMatch(/great|excellent|applied|practice|success/i);
        });
        (0, globals_1.test)('should support habit formation', async () => {
            const response = await sendChatMessage("I've been practicing active listening every day this week");
            (0, globals_1.expect)(response.content).toBeDefined();
            // Should encourage consistency
            (0, globals_1.expect)(response.content.toLowerCase()).toMatch(/consistent|habit|practice|progress|keep/i);
        });
    });
    (0, globals_1.describe)('Emotional Support', () => {
        (0, globals_1.test)('should respond to frustration', async () => {
            const response = await sendChatMessage("I'm frustrated that I keep making the same communication mistakes");
            (0, globals_1.expect)(response.content).toBeDefined();
            // Should be empathetic
            (0, globals_1.expect)(response.content.toLowerCase()).toMatch(/understand|normal|learning|progress|patience/i);
        });
        (0, globals_1.test)('should celebrate wins', async () => {
            const response = await sendChatMessage("I successfully resolved a conflict with my teammate!");
            (0, globals_1.expect)(response.content).toBeDefined();
            // Should celebrate
            (0, globals_1.expect)(response.content.toLowerCase()).toMatch(/congratulations|great|excellent|success|proud/i);
        });
    });
    (0, globals_1.afterAll)(async () => {
        // Cleanup would go here if needed
        console.log(`Integration tests completed for session ${sessionId}`);
    });
});
