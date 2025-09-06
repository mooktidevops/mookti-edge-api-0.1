#!/usr/bin/env node

import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';

// Load environment variables
config();

async function deleteNamespace(namespaceName: string) {
  console.log(`🗑️  Preparing to delete namespace: ${namespaceName}\n`);

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    console.error('❌ PINECONE_API_KEY not found in environment variables');
    process.exit(1);
  }

  const pinecone = new Pinecone({ apiKey });
  const indexName = process.env.PINECONE_INDEX_NAME || 'mookti-vectors';
  const index = pinecone.index(indexName);

  // Get current stats
  console.log('📊 Checking current state...');
  const statsBefore = await index.describeIndexStats();
  const vectorCount = statsBefore.namespaces?.[namespaceName]?.recordCount || 0;
  
  if (vectorCount === 0) {
    console.log(`⚠️  Namespace "${namespaceName}" is empty or doesn't exist`);
    return;
  }

  console.log(`Found ${vectorCount} vectors in "${namespaceName}"`);
  console.log('\n⚠️  WARNING: This will permanently delete all vectors in this namespace!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

  // Give user time to cancel
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('🗑️  Deleting namespace...');
  
  try {
    // Delete all vectors in the namespace
    await index.namespace(namespaceName).deleteAll();
    
    console.log('✅ Namespace deleted successfully');
    
    // Verify deletion
    console.log('\n🔍 Verifying deletion...');
    const statsAfter = await index.describeIndexStats();
    const remainingCount = statsAfter.namespaces?.[namespaceName]?.recordCount || 0;
    
    if (remainingCount === 0) {
      console.log('✅ Confirmed: Namespace is now empty');
    } else {
      console.log(`⚠️  Warning: ${remainingCount} vectors still remain`);
    }
  } catch (error) {
    console.error('❌ Error deleting namespace:', error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const namespace = process.argv[2] || 'public';
  await deleteNamespace(namespace);
}

main().catch(console.error);