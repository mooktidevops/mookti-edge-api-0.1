#!/usr/bin/env node

const { config } = require('dotenv');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
config();

// We'll test the storage API endpoints directly
const API_URL = process.env.API_URL || 'http://localhost:3002';

async function testStorageAPI() {
  console.log('🧪 Testing Mookti Storage API...\n');
  
  const testUserId = uuidv4();
  const testEmail = `test-${Date.now()}@mookti.ai`;
  
  try {
    // Test 1: Create User
    console.log('1️⃣ Testing user creation...');
    const userResponse = await fetch(`${API_URL}/api/storage/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        name: 'Test User',
        type: 'free',
      }),
    });
    
    if (!userResponse.ok) {
      throw new Error(`User creation failed: ${await userResponse.text()}`);
    }
    
    const user = await userResponse.json();
    console.log('✅ User created:', user.id);
    
    console.log('\n✨ Storage test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testStorageAPI().catch(console.error);