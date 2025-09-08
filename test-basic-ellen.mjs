#!/usr/bin/env node

/**
 * Basic Ellen API test
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3005';

console.log('Testing basic Ellen functionality...\n');

async function testBasic() {
  try {
    console.log('1. Testing simple query...');
    const response = await fetch(`${API_URL}/api/ellen/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key'
      },
      body: JSON.stringify({
        message: "What is 2+2?",
        context: {
          userId: 'test-user',
          sessionId: 'test-' + Date.now()
        }
      })
    });

    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Tools used:', result.toolsUsed);
      console.log('Response length:', result.response?.length);
      console.log('Success!');
    } else {
      const error = await response.text();
      console.log('Error response:', error.substring(0, 500));
    }
  } catch (error) {
    console.log('Request failed:', error.message);
  }
}

testBasic();