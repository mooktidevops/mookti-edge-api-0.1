#!/usr/bin/env node

import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';

// Load environment variables
config();

async function setupPinecone() {
  console.log('🚀 Setting up Pinecone index for Mookti v0.1...\n');

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    console.error('❌ PINECONE_API_KEY not found in environment variables');
    process.exit(1);
  }

  try {
    // Initialize Pinecone client
    const pinecone = new Pinecone({
      apiKey: apiKey,
    });

    const indexName = 'mookti-vectors';
    
    // Check if index already exists
    console.log('📋 Checking existing indexes...');
    const indexes = await pinecone.listIndexes();
    
    const existingIndex = indexes.indexes?.find(idx => idx.name === indexName);
    
    if (existingIndex) {
      console.log(`✅ Index "${indexName}" already exists!`);
      console.log(`   - Dimension: ${existingIndex.dimension}`);
      console.log(`   - Metric: ${existingIndex.metric}`);
      console.log(`   - Host: ${existingIndex.host}`);
      console.log(`   - Status: ${existingIndex.status?.ready ? 'Ready' : 'Not Ready'}`);
      
      const shouldDelete = await promptUser('\n⚠️  Do you want to DELETE and recreate this index? (y/n): ');
      
      if (shouldDelete.toLowerCase() === 'y') {
        console.log('🗑️  Deleting existing index...');
        await pinecone.deleteIndex(indexName);
        console.log('✅ Index deleted successfully');
        
        // Wait a bit for deletion to propagate
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.log('ℹ️  Keeping existing index. You can now run content indexing.');
        process.exit(0);
      }
    }

    // Create new index
    console.log(`\n📦 Creating new index "${indexName}"...`);
    console.log('   Configuration:');
    console.log('   - Dimension: 1024 (Voyage AI large-2-instruct)');
    console.log('   - Metric: cosine');
    console.log('   - Cloud: AWS');
    console.log('   - Region: us-east-1');
    
    await pinecone.createIndex({
      name: indexName,
      dimension: 1024, // Voyage AI large-2-instruct embedding dimension
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1', // Choose based on your needs
        },
      },
    });

    console.log('⏳ Waiting for index to be ready...');
    
    // Wait for index to be ready
    let isReady = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max wait
    
    while (!isReady && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const indexes = await pinecone.listIndexes();
      const index = indexes.indexes?.find(idx => idx.name === indexName);
      
      if (index?.status?.ready) {
        isReady = true;
      } else {
        process.stdout.write('.');
        attempts++;
      }
    }
    
    if (isReady) {
      console.log('\n\n✅ Index created successfully and is ready!');
      
      // Get index details
      const index = pinecone.index(indexName);
      const stats = await index.describeIndexStats();
      
      console.log('\n📊 Index Statistics:');
      console.log(`   - Total vectors: ${stats.totalRecordCount || 0}`);
      console.log(`   - Dimensions: ${stats.dimension}`);
      console.log(`   - Namespaces: ${Object.keys(stats.namespaces || {}).join(', ') || 'none'}`);
      
      console.log('\n🎉 Pinecone setup complete!');
      console.log('\n📝 Next steps:');
      console.log('   1. Run: npm run index-content seed "../coaching-expansion/content_seeds/core" --namespace public');
      console.log('   2. Run: npm run index-content seed "../coaching-expansion/content_seeds/remedial" --namespace public');
      console.log('   3. Test the search API at: https://mookti-edge-api-0-1.vercel.app/api/search');
      
    } else {
      console.error('\n❌ Index creation timed out. Please check Pinecone dashboard.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error setting up Pinecone:', error);
    process.exit(1);
  }
}

function promptUser(question: string): Promise<string> {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    readline.question(question, (answer: string) => {
      readline.close();
      resolve(answer);
    });
  });
}

// Run the setup
setupPinecone().catch(console.error);