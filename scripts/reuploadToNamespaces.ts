#!/usr/bin/env node

import { Pinecone } from '@pinecone-database/pinecone';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { config } from 'dotenv';

// Load environment variables
config();

interface EmbeddingVector {
  id: string;
  values: number[];
  metadata: {
    topic_id?: string;
    level?: string;
    domain?: string;
    [key: string]: any;
  };
}

class NamespaceUploader {
  private pinecone: Pinecone;
  private batchSize = 100;
  private embeddingsDir: string = './embeddings_cache';

  constructor() {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY not found in environment variables');
    }
    this.pinecone = new Pinecone({ apiKey });
  }

  /**
   * Determine the correct namespace based on vector metadata
   */
  private getNamespace(vector: EmbeddingVector): string {
    const id = vector.id;
    const topicId = vector.metadata?.topic_id || '';
    const level = vector.metadata?.level || '';
    
    // Check by topic ID prefix
    if (id.startsWith('REM-') || topicId.startsWith('REM-') || level === 'Remedial') {
      return 'public-remedial';
    } else if (id.startsWith('CORE-') || topicId.startsWith('CORE-') || level === 'Core') {
      return 'public-core';
    } else if (id.includes('coaching') || topicId.includes('COACH')) {
      return 'public-coaching';
    } else if (id.includes('writing') || topicId.includes('WRITE')) {
      return 'public-writing';
    } else if (id.includes('growth') || id.includes('compass')) {
      return 'public-growth';
    }
    
    // Default fallback
    console.warn(`  ⚠️  Could not determine namespace for ${id}, using public-core as default`);
    return 'public-core';
  }

  /**
   * Load embeddings from a JSONL file
   */
  private async loadEmbeddings(filepath: string): Promise<EmbeddingVector[]> {
    const vectors: EmbeddingVector[] = [];
    
    const fileStream = fs.createReadStream(filepath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.trim()) {
        try {
          const data = JSON.parse(line);
          // Transform to Pinecone's expected format
          const vector: EmbeddingVector = {
            id: data.id,
            values: data.embedding || data.values, // Handle both field names
            metadata: data.metadata || {}
          };
          vectors.push(vector);
        } catch (error) {
          console.error(`Failed to parse line: ${error}`);
        }
      }
    }

    return vectors;
  }

  /**
   * Upload vectors to their appropriate namespaces
   */
  async uploadToNamespaces(): Promise<void> {
    console.log('🚀 Re-uploading embeddings to organized namespaces...\n');
    console.log(`📁 Embeddings directory: ${this.embeddingsDir}`);
    
    // Check if embeddings directory exists
    if (!fs.existsSync(this.embeddingsDir)) {
      console.error(`❌ Embeddings directory not found: ${this.embeddingsDir}`);
      process.exit(1);
    }

    // Find all embedding files
    const embeddingFiles = fs.readdirSync(this.embeddingsDir)
      .filter(file => file.endsWith('_embeddings.jsonl'))
      .map(file => path.join(this.embeddingsDir, file));
    
    if (embeddingFiles.length === 0) {
      console.error('❌ No embedding files found');
      process.exit(1);
    }

    console.log(`📁 Found ${embeddingFiles.length} embedding files\n`);

    const index = this.pinecone.index(process.env.PINECONE_INDEX_NAME || 'mookti-vectors');
    
    // Track vectors by namespace
    const namespaceStats: Record<string, number> = {
      'public-remedial': 0,
      'public-core': 0,
      'public-coaching': 0,
      'public-writing': 0,
      'public-growth': 0
    };

    for (const file of embeddingFiles) {
      const filename = path.basename(file);
      console.log(`\n📄 Processing: ${filename}`);
      
      const vectors = await this.loadEmbeddings(file);
      console.log(`  📊 Loaded ${vectors.length} vectors`);
      
      // Group vectors by namespace
      const vectorsByNamespace: Record<string, EmbeddingVector[]> = {};
      
      for (const vector of vectors) {
        const namespace = this.getNamespace(vector);
        if (!vectorsByNamespace[namespace]) {
          vectorsByNamespace[namespace] = [];
        }
        vectorsByNamespace[namespace].push(vector);
      }
      
      // Upload to each namespace
      for (const [namespace, nsVectors] of Object.entries(vectorsByNamespace)) {
        if (nsVectors.length === 0) continue;
        
        console.log(`  📤 Uploading ${nsVectors.length} vectors to ${namespace}`);
        
        const startTime = Date.now();
        let uploaded = 0;
        
        // Upload in batches
        for (let i = 0; i < nsVectors.length; i += this.batchSize) {
          const batch = nsVectors.slice(i, i + this.batchSize);
          
          try {
            await index.namespace(namespace).upsert(batch);
            uploaded += batch.length;
            namespaceStats[namespace] += batch.length;
            
            // Show progress
            if (nsVectors.length > this.batchSize) {
              const progress = Math.round((uploaded / nsVectors.length) * 100);
              console.log(`     ⬆️  Progress: ${progress}%`);
            }
          } catch (error) {
            console.error(`     ❌ Error uploading batch: ${error}`);
          }
        }
        
        const elapsed = (Date.now() - startTime) / 1000;
        console.log(`     ✅ Completed in ${elapsed.toFixed(1)}s`);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Upload Summary:');
    console.log('='.repeat(60));
    
    for (const [namespace, count] of Object.entries(namespaceStats)) {
      if (count > 0) {
        console.log(`  • ${namespace}: ${count} vectors`);
      }
    }
    
    // Verify with Pinecone stats
    console.log('\n🔍 Verifying with Pinecone...');
    const stats = await index.describeIndexStats();
    
    console.log('\n📂 Final Namespace Status:');
    const namespaces = stats.namespaces || {};
    for (const [ns, data] of Object.entries(namespaces)) {
      console.log(`  • ${ns}: ${data.recordCount} total vectors`);
    }
    
    console.log('\n✨ Re-upload complete!');
  }
}

// Main execution
async function main() {
  const uploader = new NamespaceUploader();
  await uploader.uploadToNamespaces();
}

main().catch(console.error);