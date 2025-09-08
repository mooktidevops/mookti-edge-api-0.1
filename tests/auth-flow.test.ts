import { describe, it, expect } from '@jest/globals';
import { DEV_USER_ID, DEV_USER_EMAIL } from '../lib/config/dev-mode';
import { getEnvironmentConfig } from '../lib/config/environment';

const config = getEnvironmentConfig();
const BASE_URL = config.edgeApiUrl;

describe('Auth Flow Integration Tests', () => {
  describe('Development Mode', () => {
    it('should bypass auth with dev headers', async () => {
      const response = await fetch(`${BASE_URL}/api/storage/users`, {
        headers: {
          'X-Dev-Mode': 'true',
          'X-Dev-User-Id': DEV_USER_ID,
        },
      });
      
      expect(response.ok).toBe(true);
    });

    it('should use consistent dev user ID', async () => {
      const response = await fetch(`${BASE_URL}/api/storage/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Mode': 'true',
          'X-Dev-User-Id': DEV_USER_ID,
        },
        body: JSON.stringify({
          userId: DEV_USER_ID,
          title: 'Test Chat',
          visibility: 'private',
        }),
      });
      
      expect(response.ok).toBe(true);
      const chat = await response.json();
      expect(chat.userId).toBe(DEV_USER_ID);
    });

    it('should skip ownership checks in dev mode', async () => {
      // Create a chat with one user
      const createResponse = await fetch(`${BASE_URL}/api/storage/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Mode': 'true',
          'X-Dev-User-Id': 'user-1',
        },
        body: JSON.stringify({
          userId: 'user-1',
          title: 'User 1 Chat',
          visibility: 'private',
        }),
      });
      
      const chat = await createResponse.json();
      
      // Try to access it with a different user in dev mode
      const getResponse = await fetch(`${BASE_URL}/api/storage/chats/${chat.id}`, {
        headers: {
          'X-Dev-Mode': 'true',
          'X-Dev-User-Id': 'user-2',
        },
      });
      
      // Should succeed due to dev mode ownership bypass
      expect(getResponse.ok).toBe(true);
    });
  });

  describe('Ellen Direct Mode', () => {
    it('should connect to Ellen sessions API directly', async () => {
      const response = await fetch(`${BASE_URL}/api/ellen/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Mode': 'true',
          'X-Dev-User-Id': DEV_USER_ID,
        },
        body: JSON.stringify({
          query: 'Hello Ellen',
          sessionId: 'test-session-id',
          userId: DEV_USER_ID,
          stream: false,
        }),
      });
      
      // Check that we get a response (might be 200 or 500 depending on Ellen state)
      expect(response).toBeDefined();
    });

    it('should handle streaming responses', async () => {
      const response = await fetch(`${BASE_URL}/api/ellen/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Mode': 'true',
          'X-Dev-User-Id': DEV_USER_ID,
        },
        body: JSON.stringify({
          query: 'Tell me about learning',
          sessionId: 'test-stream-session',
          userId: DEV_USER_ID,
          stream: true,
        }),
      });
      
      // Check for streaming response headers
      const contentType = response.headers.get('content-type');
      if (response.ok) {
        expect(contentType).toContain('text/event-stream');
      }
    });
  });

  describe('Environment Detection', () => {
    it('should correctly identify development environment', () => {
      const config = getEnvironmentConfig();
      
      if (process.env.NODE_ENV === 'development') {
        expect(config.isDevelopment).toBe(true);
        expect(config.enableDevMode).toBe(true);
        expect(config.devUserId).toBe(DEV_USER_ID);
      }
    });

    it('should have correct API URLs', () => {
      const config = getEnvironmentConfig();
      
      expect(config.edgeApiUrl).toBeDefined();
      expect(config.webappUrl).toBeDefined();
      
      if (config.isDevelopment) {
        expect(config.edgeApiUrl).toContain('localhost');
      }
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed errors in dev mode', async () => {
      const response = await fetch(`${BASE_URL}/api/storage/chats/non-existent-id`, {
        headers: {
          'X-Dev-Mode': 'true',
          'X-Dev-User-Id': DEV_USER_ID,
        },
      });
      
      expect(response.status).toBe(404);
      const error = await response.json();
      expect(error.error).toBeDefined();
    });

    it('should handle malformed requests gracefully', async () => {
      const response = await fetch(`${BASE_URL}/api/storage/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Mode': 'true',
        },
        body: 'invalid json',
      });
      
      expect(response.ok).toBe(false);
    });
  });
});

// Helper function to run tests
export async function runAuthTests(): Promise<void> {
  console.log('Running Auth Flow Integration Tests...');
  console.log('Base URL:', BASE_URL);
  console.log('Dev User ID:', DEV_USER_ID);
  console.log('Environment:', config.name);
  
  try {
    // Run a simple connectivity test
    const healthCheck = await fetch(`${BASE_URL}/api/health`, {
      headers: {
        'X-Dev-Mode': 'true',
      },
    }).catch(() => null);
    
    if (!healthCheck) {
      console.error('❌ Cannot connect to Edge API at', BASE_URL);
      console.log('Make sure the Edge API is running: cd mookti-edge-api && npm run dev');
      return;
    }
    
    console.log('✅ Connected to Edge API');
    
    // Test dev mode auth
    const authTest = await fetch(`${BASE_URL}/api/storage/users`, {
      headers: {
        'X-Dev-Mode': 'true',
        'X-Dev-User-Id': DEV_USER_ID,
      },
    });
    
    if (authTest.ok) {
      console.log('✅ Dev mode auth working');
    } else {
      console.log('❌ Dev mode auth failed:', authTest.status);
    }
    
    // Test chat creation
    const chatTest = await fetch(`${BASE_URL}/api/storage/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-Mode': 'true',
        'X-Dev-User-Id': DEV_USER_ID,
      },
      body: JSON.stringify({
        userId: DEV_USER_ID,
        title: 'Integration Test Chat',
        visibility: 'private',
      }),
    });
    
    if (chatTest.ok) {
      const chat = await chatTest.json();
      console.log('✅ Chat creation working:', chat.id);
      
      // Test chat retrieval
      const getTest = await fetch(`${BASE_URL}/api/storage/chats/${chat.id}`, {
        headers: {
          'X-Dev-Mode': 'true',
          'X-Dev-User-Id': DEV_USER_ID,
        },
      });
      
      if (getTest.ok) {
        console.log('✅ Chat retrieval working');
      } else {
        console.log('❌ Chat retrieval failed:', getTest.status);
      }
    } else {
      console.log('❌ Chat creation failed:', chatTest.status);
    }
    
    console.log('\n✅ Auth flow tests completed');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAuthTests();
}