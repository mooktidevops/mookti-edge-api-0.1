#!/usr/bin/env node

// Simple test to debug Ellen API issues

async function testEllenChat() {
  console.log('Testing Ellen Chat API...\n');
  
  const testMessage = {
    message: "What is photosynthesis?",
    context: {
      userId: "test-user",
      sessionId: "test-session-" + Date.now(),
      sessionType: "study"
    }
  };
  
  console.log('Request:', JSON.stringify(testMessage, null, 2));
  
  try {
    const response = await fetch('http://localhost:3001/api/ellen/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    });
    
    console.log('\nResponse Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('\nResponse Body:', text);
    
    if (response.ok) {
      try {
        const data = JSON.parse(text);
        console.log('\nParsed Response:');
        console.log('- Has response:', !!data.response);
        console.log('- Response length:', data.response?.length || 0);
        console.log('- Tools used:', data.toolsUsed || 'none');
        console.log('- Model used:', data.modelUsed || 'unknown');
      } catch (e) {
        console.log('Could not parse as JSON');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testEllenChat();