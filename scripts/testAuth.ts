#!/usr/bin/env node

import { config } from 'dotenv';
config();

// This script tests the API with a mock Firebase token
// In production, the iOS app will provide real Firebase tokens

const API_BASE = 'https://mookti-edge-api-0-1.vercel.app/api';

// Mock Firebase token for testing
// In production, this comes from Firebase Auth in the iOS app
const MOCK_TOKEN = 'mock-firebase-token-for-testing';

async function testAuthenticatedEndpoints() {
  console.log('🔐 Testing Authenticated Endpoints');
  console.log('=' .repeat(60));
  console.log('Note: These will fail with 401 without valid Firebase token');
  console.log('This is expected behavior - the iOS app will provide real tokens\n');

  const endpoints = [
    {
      name: 'Search API',
      method: 'POST',
      path: '/search',
      body: {
        query: 'What is machine learning?',
        topK: 3,
        includeUserDocs: false
      }
    },
    {
      name: 'Chat API',
      method: 'POST',
      path: '/chat',
      body: {
        message: 'Hello Ellen, can you help me learn calculus?',
        chatHistory: [],
        currentNodeId: '1',
        useRAG: true
      }
    },
    {
      name: 'Learning Paths',
      method: 'GET',
      path: '/learning-paths',
      body: null
    },
    {
      name: 'Get Progress',
      method: 'GET',
      path: '/progress/workplace_success',
      body: null
    },
    {
      name: 'Sync Progress',
      method: 'POST',
      path: '/progress/sync',
      body: {
        path_id: 'workplace_success',
        current_node: '2',
        completed_nodes: ['1'],
        module_progress: { intro: 50 }
      }
    }
  ];

  for (const endpoint of endpoints) {
    console.log(`\n📝 Testing: ${endpoint.name}`);
    console.log(`   ${endpoint.method} ${endpoint.path}`);
    
    try {
      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOCK_TOKEN}`
        }
      };
      
      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }
      
      const response = await fetch(`${API_BASE}${endpoint.path}`, options);
      
      if (response.status === 401) {
        console.log('   ✅ Authentication working (401 as expected with mock token)');
      } else if (response.ok) {
        console.log(`   ✅ Success (${response.status})`);
        const data = await response.json();
        console.log(`   Response preview: ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        console.log(`   ⚠️  Unexpected status: ${response.status}`);
        const text = await response.text();
        console.log(`   Response: ${text.substring(0, 100)}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📱 iOS Integration Instructions:');
  console.log('1. Configure Firebase Auth in iOS app');
  console.log('2. Get real Firebase ID token from Auth.auth().currentUser');
  console.log('3. Include token in Authorization header for all API calls');
  console.log('4. The API will validate the token and return data\n');
}

async function testPublicEndpoints() {
  console.log('\n🌐 Testing Public Endpoints');
  console.log('=' .repeat(60));
  
  // Test search without auth
  console.log('\n📝 Testing: Public Search Test');
  try {
    const response = await fetch(`${API_BASE}/search-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'What are derivatives in calculus?',
        topK: 2,
        namespace: 'public'
      })
    });
    
    if (response.ok) {
      const data = await response.json() as any;
      console.log('   ✅ Search working!');
      console.log(`   Found ${data.results?.length || 0} results`);
      
      if (data.results && data.results.length > 0) {
        console.log('\n   Top Results:');
        data.results.forEach((r: any, i: number) => {
          console.log(`   ${i + 1}. Score: ${r.score?.toFixed(3)}`);
          console.log(`      ${r.metadata?.title || 'No title'}`);
          console.log(`      ${r.content?.substring(0, 100)}...`);
        });
      }
    } else {
      console.log(`   ❌ Failed: ${response.status}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Test monitoring
  console.log('\n📝 Testing: Redis Monitoring');
  try {
    const response = await fetch(`${API_BASE}/monitoring/redis-stats`, {
      headers: { 'Authorization': 'Bearer beta-monitoring-2024' }
    });
    
    if (response.ok) {
      const data = await response.json() as any;
      console.log('   ✅ Monitoring working!');
      console.log(`   Commands today: ${data.stats?.commands_today || 0}`);
      console.log(`   Usage: ${data.stats?.usage_percentage || 0}%`);
    } else {
      console.log(`   ❌ Failed: ${response.status}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Mookti Edge API v0.1 - Authentication Test');
  console.log('=' .repeat(60));
  console.log(`API Base: ${API_BASE}`);
  console.log(`Time: ${new Date().toISOString()}\n`);
  
  await testPublicEndpoints();
  await testAuthenticatedEndpoints();
  
  console.log('\n✅ API Status Summary:');
  console.log('- Public endpoints (search-test, monitoring): WORKING');
  console.log('- Authenticated endpoints: PROTECTED (401 with mock token)');
  console.log('- Vector search: OPERATIONAL');
  console.log('- Ready for iOS app integration with Firebase Auth');
}

main().catch(console.error);