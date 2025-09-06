#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function testKVConnection() {
  console.log('Testing Vercel KV connection...\n');
  
  try {
    // Import dynamically to ensure env vars are loaded
    const { kv } = await import('@vercel/kv');
    
    // Test 1: Set a value
    console.log('1️⃣ Setting test value...');
    await kv.set('test:connection', 'working', { ex: 60 });
    console.log('✅ Set successful');
    
    // Test 2: Get the value
    console.log('\n2️⃣ Getting test value...');
    const value = await kv.get('test:connection');
    console.log(`✅ Got value: ${value}`);
    
    // Test 3: Delete the value
    console.log('\n3️⃣ Deleting test value...');
    await kv.del('test:connection');
    console.log('✅ Deleted successfully');
    
    console.log('\n🎉 KV connection is working!');
    
  } catch (error) {
    console.error('❌ KV connection failed:', error);
    process.exit(1);
  }
}

testKVConnection().catch(console.error);