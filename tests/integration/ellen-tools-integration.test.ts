/**
 * Integration Tests for Ellen Pedagogical Tools
 * Tests the full flow of Ellen's tools with the chat API
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

// API endpoint configuration
const API_BASE = 'http://localhost:3002';
const TEST_CHAT_ENDPOINT = `${API_BASE}/api/test-chat`;
const ELLEN_SESSION_ENDPOINT = `${API_BASE}/api/ellen/sessions`;

// Test utilities
async function sendChatMessage(message: string, provider = 'openai') {
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

async function createEllenSession(userId: string, sessionGoal: string) {
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

describe('Ellen Pedagogical Tools Integration', () => {
  let sessionId: string;
  const testUserId = 'test-user-' + Date.now();

  beforeAll(async () => {
    // Create a test Ellen session
    const session = await createEllenSession(
      testUserId,
      'Master workplace communication'
    );
    sessionId = session.sessionId;
  });

  describe('Socratic Questioning', () => {
    test('should engage with productive confusion', async () => {
      const response = await sendChatMessage(
        "I don't understand why active listening is important in meetings"
      );

      expect(response.content).toBeDefined();
      expect(response.content.toLowerCase()).toMatch(
        /active listening|understanding|communication/i
      );
    });

    test('should use clarifying questions', async () => {
      const response = await sendChatMessage(
        "How do I handle difficult conversations?"
      );

      expect(response.content).toBeDefined();
      // Should provide answer followed by a question
      expect(response.content).toMatch(/\?/);
    });

    test('should recognize aporia moments', async () => {
      const response = await sendChatMessage(
        "I'm confused about when to be assertive versus collaborative"
      );

      expect(response.content).toBeDefined();
      // Should acknowledge the productive confusion
      expect(response.content.toLowerCase()).toMatch(
        /balance|both|depends|context|situation/i
      );
    });
  });

  describe('Reflection Tools', () => {
    test('should support metacognitive reflection', async () => {
      const response = await sendChatMessage(
        "I noticed I tend to interrupt people when I'm excited about an idea"
      );

      expect(response.content).toBeDefined();
      // Should validate the self-awareness
      expect(response.content.toLowerCase()).toMatch(
        /awareness|notice|recognize|insight/i
      );
    });

    test('should guide pattern recognition', async () => {
      const response = await sendChatMessage(
        "I keep having the same conflict with my manager about deadlines"
      );

      expect(response.content).toBeDefined();
      // Should help identify patterns
      expect(response.content.toLowerCase()).toMatch(
        /pattern|recurring|tends to|often|usually/i
      );
    });
  });

  describe('Study Utilities', () => {
    test('should generate practice scenarios', async () => {
      const response = await sendChatMessage(
        "Can you give me a practice scenario for giving feedback?"
      );

      expect(response.content).toBeDefined();
      // Should include scenario elements
      expect(response.content.toLowerCase()).toMatch(
        /scenario|imagine|suppose|situation|example/i
      );
    });

    test('should provide retrieval practice', async () => {
      const response = await sendChatMessage(
        "Test me on the key principles of effective communication"
      );

      expect(response.content).toBeDefined();
      // Should include testing elements
      expect(response.content).toLowerCase()).toMatch(
        /recall|remember|what|explain|describe/i
      );
    });

    test('should offer spaced repetition guidance', async () => {
      const response = await sendChatMessage(
        "How should I review what I've learned about conflict resolution?"
      );

      expect(response.content).toBeDefined();
      // Should mention review strategies
      expect(response.content.toLowerCase()).toMatch(
        /review|practice|revisit|reinforce|space/i
      );
    });
  });

  describe('Multi-Provider Support', () => {
    test('should work with OpenAI', async () => {
      const response = await sendChatMessage(
        "What's the most important communication skill?",
        'openai'
      );

      expect(response.content).toBeDefined();
      expect(response.provider).toBe('openai');
    });

    test('should work with Anthropic', async () => {
      const response = await sendChatMessage(
        "What's the most important communication skill?",
        'anthropic'
      );

      expect(response.content).toBeDefined();
      expect(response.provider).toBe('anthropic');
    });

    test('should work with Google', async () => {
      const response = await sendChatMessage(
        "What's the most important communication skill?",
        'google'
      );

      expect(response.content).toBeDefined();
      expect(response.provider).toBe('google');
    });
  });

  describe('Growth Compass Integration', () => {
    test('should track conceptual understanding', async () => {
      const response = await sendChatMessage(
        "I finally understand how empathy and assertiveness work together!"
      );

      expect(response.content).toBeDefined();
      // Should acknowledge the breakthrough
      expect(response.content.toLowerCase()).toMatch(
        /understand|insight|connection|breakthrough|excellent/i
      );
    });

    test('should recognize skill application', async () => {
      const response = await sendChatMessage(
        "I used the STAR method in my interview today and it went great!"
      );

      expect(response.content).toBeDefined();
      // Should celebrate application
      expect(response.content.toLowerCase()).toMatch(
        /great|excellent|applied|practice|success/i
      );
    });

    test('should support habit formation', async () => {
      const response = await sendChatMessage(
        "I've been practicing active listening every day this week"
      );

      expect(response.content).toBeDefined();
      // Should encourage consistency
      expect(response.content.toLowerCase()).toMatch(
        /consistent|habit|practice|progress|keep/i
      );
    });
  });

  describe('Emotional Support', () => {
    test('should respond to frustration', async () => {
      const response = await sendChatMessage(
        "I'm frustrated that I keep making the same communication mistakes"
      );

      expect(response.content).toBeDefined();
      // Should be empathetic
      expect(response.content.toLowerCase()).toMatch(
        /understand|normal|learning|progress|patience/i
      );
    });

    test('should celebrate wins', async () => {
      const response = await sendChatMessage(
        "I successfully resolved a conflict with my teammate!"
      );

      expect(response.content).toBeDefined();
      // Should celebrate
      expect(response.content.toLowerCase()).toMatch(
        /congratulations|great|excellent|success|proud/i
      );
    });
  });

  afterAll(async () => {
    // Cleanup would go here if needed
    console.log(`Integration tests completed for session ${sessionId}`);
  });
});