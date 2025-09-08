#!/usr/bin/env node

// Test basic API functionality without Ellen

async function testAPIs() {
  console.log('Testing Edge API endpoints...\n');
  
  const tests = [
    {
      name: 'Database Connection',
      url: 'http://localhost:3001/api/storage/test-db',
      method: 'GET'
    },
    {
      name: 'Growth Compass Status',
      url: 'http://localhost:3001/api/growth-compass/status',
      method: 'GET'
    },
    {
      name: 'Ellen Sessions List',
      url: 'http://localhost:3001/api/ellen/sessions',
      method: 'GET'
    }
  ];
  
  for (const test of tests) {
    console.log(`Testing: ${test.name}`);
    console.log(`URL: ${test.url}`);
    
    try {
      const response = await fetch(test.url, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
      } else {
        const text = await response.text();
        console.log('Error:', text);
      }
    } catch (error) {
      console.error('Failed:', error.message);
    }
    
    console.log('-'.repeat(50) + '\n');
  }
}

testAPIs();