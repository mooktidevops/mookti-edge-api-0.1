#!/usr/bin/env node

import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

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
    
    // Test 2: Get User
    console.log('\n2️⃣ Testing user retrieval...');
    const getUserResponse = await fetch(`${API_URL}/api/storage/users?userId=${user.id}`);
    
    if (!getUserResponse.ok) {
      throw new Error(`User retrieval failed: ${await getUserResponse.text()}`);
    }
    
    const retrievedUser = await getUserResponse.json();
    console.log('✅ User retrieved:', retrievedUser.email);
    
    // Test 3: Create Chat
    console.log('\n3️⃣ Testing chat creation...');
    const chatResponse = await fetch(`${API_URL}/api/storage/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        title: 'Test Chat',
        visibility: 'private',
      }),
    });
    
    if (!chatResponse.ok) {
      throw new Error(`Chat creation failed: ${await chatResponse.text()}`);
    }
    
    const chat = await chatResponse.json();
    console.log('✅ Chat created:', chat.id);
    
    // Test 4: Add Message
    console.log('\n4️⃣ Testing message creation...');
    const messageResponse = await fetch(`${API_URL}/api/storage/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: chat.id,
        role: 'user',
        content: 'Hello, Ellen! Can you help me learn about photosynthesis?',
        model: 'claude-3-opus',
        provider: 'anthropic',
      }),
    });
    
    if (!messageResponse.ok) {
      throw new Error(`Message creation failed: ${await messageResponse.text()}`);
    }
    
    const message = await messageResponse.json();
    console.log('✅ Message created:', message.id);
    
    // Test 5: Get Messages
    console.log('\n5️⃣ Testing message retrieval...');
    const getMessagesResponse = await fetch(`${API_URL}/api/storage/messages?chatId=${chat.id}`);
    
    if (!getMessagesResponse.ok) {
      throw new Error(`Message retrieval failed: ${await getMessagesResponse.text()}`);
    }
    
    const messages = await getMessagesResponse.json();
    console.log('✅ Messages retrieved:', messages.length, 'message(s)');
    
    // Test 6: Search (will fail without embeddings, but tests the endpoint)
    console.log('\n6️⃣ Testing conversation search...');
    const searchResponse = await fetch(`${API_URL}/api/storage/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        query: 'photosynthesis',
        limit: 5,
      }),
    });
    
    if (!searchResponse.ok) {
      console.warn('⚠️ Search failed (expected if embeddings not configured):', await searchResponse.text());
    } else {
      const searchResults = await searchResponse.json();
      console.log('✅ Search completed:', searchResults.length, 'result(s)');
    }
    
    console.log('\n✨ All storage tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testStorageAPI().catch(console.error);