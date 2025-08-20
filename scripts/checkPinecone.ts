#!/usr/bin/env node

import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';

// Load environment variables
config();

async function checkPineconeIndex() {
  console.log('🔍 Checking Pinecone index contents...\n');

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
    const index = pinecone.index(indexName);
    
    // Get index statistics
    const stats = await index.describeIndexStats();
    
    console.log('📊 Index Statistics:');
    console.log('════════════════════════════════════════');
    console.log(`📌 Index Name: ${indexName}`);
    console.log(`📐 Dimensions: ${stats.dimension}`);
    console.log(`📦 Total Vectors: ${stats.totalRecordCount || 0}`);
    console.log(`💾 Index Fullness: ${Math.round((stats.indexFullness || 0) * 100)}%`);
    
    console.log('\n📂 Namespaces:');
    console.log('════════════════════════════════════════');
    
    if (stats.namespaces && Object.keys(stats.namespaces).length > 0) {
      for (const [namespace, data] of Object.entries(stats.namespaces)) {
        console.log(`\n  📁 ${namespace || '(default)'}`);
        console.log(`     └─ Vectors: ${data.recordCount}`);
      }
      
      // Sample some vectors from each namespace to see what's there
      console.log('\n🔎 Sample Content (first vector from each namespace):');
      console.log('════════════════════════════════════════');
      
      for (const namespace of Object.keys(stats.namespaces)) {
        try {
          // Query for one vector to see metadata
          const queryResponse = await index.namespace(namespace).query({
            vector: new Array(1024).fill(0), // Dummy vector for metadata check
            topK: 1,
            includeMetadata: true,
          });
          
          if (queryResponse.matches && queryResponse.matches.length > 0) {
            const sample = queryResponse.matches[0];
            console.log(`\n  📁 ${namespace || '(default)'} - Sample Vector:`);
            console.log(`     ID: ${sample.id}`);
            if (sample.metadata) {
              console.log(`     Metadata:`);
              Object.entries(sample.metadata).forEach(([key, value]) => {
                if (typeof value === 'string' && value.length > 100) {
                  console.log(`       - ${key}: ${value.substring(0, 100)}...`);
                } else {
                  console.log(`       - ${key}: ${value}`);
                }
              });
            }
          }
        } catch (err) {
          // Ignore query errors for sampling
        }
      }
    } else {
      console.log('  ⚠️  No namespaces found - index is empty');
    }
    
    console.log('\n✅ Index check complete!');
    console.log('\n📝 Notes:');
    console.log('  • The indexContent script will ADD to existing namespaces');
    console.log('  • It won\'t overwrite unless you use the same vector IDs');
    console.log('  • Use different namespaces to separate content types:');
    console.log('    - "public" for shared educational content');
    console.log('    - "u_<userId>" for user-specific uploads');
    
    if (!stats.namespaces || !stats.namespaces['public']) {
      console.log('\n⚠️  No "public" namespace found!');
      console.log('  You should index the core content:');
      console.log('  npm run index-content seed "../coaching-expansion/content_seeds/core" --namespace public');
    }
    
  } catch (error) {
    console.error('\n❌ Error checking Pinecone:', error);
    process.exit(1);
  }
}

// Run the check
checkPineconeIndex().catch(console.error);