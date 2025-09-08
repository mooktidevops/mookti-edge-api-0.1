#!/usr/bin/env node

// Debug test to see actual error from Ellen API

async function debugEllenAPI() {
  console.log('Testing Ellen Chat API with detailed error logging...\n');
  
  const testMessage = {
    message: "What is 2+2?", // Simple query that should work
    context: {
      userId: "debug-user",
      sessionId: "debug-session-" + Date.now()
    }
  };
  
  console.log('Request:', JSON.stringify(testMessage, null, 2));
  console.log('\nSending request...');
  
  try {
    const response = await fetch('http://localhost:3001/api/ellen/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    });
    
    console.log('\nResponse Status:', response.status);
    
    const text = await response.text();
    console.log('Raw Response:', text);
    
    // Check if we can get more info from headers
    const requestId = response.headers.get('x-vercel-id');
    if (requestId) {
      console.log('\nRequest ID for debugging:', requestId);
    }
    
    if (!response.ok) {
      // Try to parse error details
      try {
        const error = JSON.parse(text);
        console.log('\nError details:', error);
      } catch {
        console.log('\nCould not parse error response as JSON');
      }
    } else {
      const data = JSON.parse(text);
      console.log('\nSuccess! Response received:');
      console.log('- Response length:', data.response?.length || 0);
      console.log('- Tools used:', data.toolsUsed || 'none');
    }
  } catch (error) {
    console.error('\nFetch error:', error);
  }
}

debugEllenAPI();