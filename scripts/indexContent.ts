#!/usr/bin/env node

import { Pinecone } from '@pinecone-database/pinecone';
import { VoyageAIClient } from 'voyageai';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { config } from 'dotenv';

// Load environment variables
config();

interface ContentCard {
  topic_id: string;
  title: string;
  domain: string;
  subdomain: string;
  level: string;
  methods: string[];
  learning_objectives: string[];
  primer: string;
  misconceptions: Array<{
    misconception: string;
    refutation: string;
    explanation: string;
  }>;
  quick_check: Array<{
    question: string;
    answer: string;
    rationale: string;
  }>;
  worked_example?: any;
  practice_set?: any[];
  socratic_hints?: any;
  anchors_analogies?: any;
  extension_questions?: any[];
  retrieval_queries?: string[];
  prerequisites?: string[];
  next_concepts?: string[];
  citations?: Array<{
    title: string;
    source: string;
  }>;
  license?: string;
}

class ContentIndexer {
  private pinecone: Pinecone;
  private voyage: VoyageAIClient;
  private batchSize = 100;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    this.voyage = new VoyageAIClient({
      apiKey: process.env.VOYAGE_API_KEY!,
    });
  }

  async indexContentSeeds(seedPath: string, namespace: string = 'public'): Promise<void> {
    console.log(`\n🚀 Starting content indexing from: ${seedPath}`);
    console.log(`📍 Target namespace: ${namespace}`);

    // Find all JSONL files
    const jsonlFiles = this.findJsonlFiles(seedPath);
    console.log(`📁 Found ${jsonlFiles.length} JSONL files to process`);

    const index = this.pinecone.index(process.env.PINECONE_INDEX_NAME || 'mookti-vectors');
    let totalVectors = 0;

    for (const file of jsonlFiles) {
      console.log(`\n📄 Processing: ${path.basename(file)}`);
      const vectors = await this.processJsonlFile(file);
      
      if (vectors.length > 0) {
        // Batch upsert vectors
        for (let i = 0; i < vectors.length; i += this.batchSize) {
          const batch = vectors.slice(i, i + this.batchSize);
          await index.namespace(namespace).upsert(batch);
          console.log(`  ✅ Indexed batch ${Math.floor(i / this.batchSize) + 1} (${batch.length} vectors)`);
        }
        totalVectors += vectors.length;
      }
    }

    console.log(`\n✨ Indexing complete! Total vectors indexed: ${totalVectors}`);
  }

  private findJsonlFiles(dir: string): string[] {
    const files: string[] = [];
    
    function walk(currentDir: string) {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (item.endsWith('.jsonl')) {
          files.push(fullPath);
        }
      }
    }
    
    walk(dir);
    return files;
  }

  private async processJsonlFile(filePath: string): Promise<any[]> {
    const vectors: any[] = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const lines: string[] = [];
    for await (const line of rl) {
      if (line.trim()) {
        lines.push(line);
      }
    }

    console.log(`  📊 Processing ${lines.length} content cards...`);

    for (const line of lines) {
      try {
        const card: ContentCard = JSON.parse(line);
        const cardVectors = await this.createVectorsFromCard(card);
        vectors.push(...cardVectors);
      } catch (error) {
        console.error(`  ❌ Error processing line: ${error}`);
      }
    }

    return vectors;
  }

  private async createVectorsFromCard(card: ContentCard): Promise<any[]> {
    const vectors: any[] = [];
    
    // Create chunks from different sections of the card
    const chunks = [
      {
        id: `${card.topic_id}_primer`,
        text: `${card.title}\n\n${card.primer}`,
        type: 'primer',
      },
      {
        id: `${card.topic_id}_objectives`,
        text: `Learning objectives for ${card.title}:\n${card.learning_objectives.join('\n')}`,
        type: 'objectives',
      },
    ];

    // Add misconceptions as separate chunks
    card.misconceptions?.forEach((m, i) => {
      chunks.push({
        id: `${card.topic_id}_misconception_${i}`,
        text: `Common misconception: ${m.misconception}\nCorrection: ${m.refutation}\nExplanation: ${m.explanation}`,
        type: 'misconception',
      });
    });

    // Add quick checks
    card.quick_check?.forEach((q, i) => {
      chunks.push({
        id: `${card.topic_id}_check_${i}`,
        text: `Question: ${q.question}\nAnswer: ${q.answer}\nRationale: ${q.rationale}`,
        type: 'quick_check',
      });
    });

    // Add worked example if present
    if (card.worked_example) {
      const exampleText = `Worked Example: ${card.worked_example.prompt}\n${
        card.worked_example.steps?.map((s: any) => `Step: ${s.step} - Why: ${s.why}`).join('\n')
      }`;
      chunks.push({
        id: `${card.topic_id}_example`,
        text: exampleText,
        type: 'worked_example',
      });
    }

    // Generate embeddings for all chunks
    for (const chunk of chunks) {
      try {
        const response = await this.voyage.embed({
          input: chunk.text,
          model: 'voyage-large-2-instruct',
        });

        vectors.push({
          id: chunk.id,
          values: response.data![0].embedding,
          metadata: {
            topic_id: card.topic_id,
            title: card.title,
            domain: card.domain,
            subdomain: card.subdomain,
            level: card.level,
            chunk_type: chunk.type,
            text: chunk.text.substring(0, 1000), // Truncate for metadata
            // Flatten arrays to strings for Pinecone compatibility
            methods: Array.isArray(card.methods) ? card.methods.join(', ') : '',
            retrieval_queries: Array.isArray(card.retrieval_queries) ? card.retrieval_queries.join(' | ') : '',
            // Flatten citations object array to string
            citations: Array.isArray(card.citations) ? 
              card.citations.map((c: any) => `${c.title || ''} - ${c.source || ''}`).filter(s => s !== ' - ').join(' | ') : '',
            license: card.license || 'CC-BY-4.0',
          },
        });
      } catch (error) {
        console.error(`    ❌ Error embedding chunk ${chunk.id}: ${error}`);
      }
    }

    return vectors;
  }

  async createIndex(indexName: string, dimension: number = 1024): Promise<void> {
    try {
      await this.pinecone.createIndex({
        name: indexName,
        dimension,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });
      console.log(`✅ Created index: ${indexName}`);
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(`ℹ️ Index ${indexName} already exists`);
      } else {
        throw error;
      }
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log(`
Usage: npm run index-content <command> [options]

Commands:
  seed <path>     Index content from JSONL files in the specified path
  create-index    Create a new Pinecone index

Options:
  --namespace     Pinecone namespace (default: 'public')
  --index-name    Name of the Pinecone index

Examples:
  npm run index-content seed ./content_seeds/core --namespace public
  npm run index-content create-index --index-name mookti-vectors
    `);
    process.exit(1);
  }

  const indexer = new ContentIndexer();
  const command = args[0];

  switch (command) {
    case 'seed': {
      const seedPath = args[1];
      if (!seedPath) {
        console.error('❌ Please provide a path to the content seeds');
        process.exit(1);
      }

      const namespaceIndex = args.indexOf('--namespace');
      const namespace = namespaceIndex > -1 ? args[namespaceIndex + 1] : 'public';

      await indexer.indexContentSeeds(seedPath, namespace);
      break;
    }

    case 'create-index': {
      const nameIndex = args.indexOf('--index-name');
      const indexName = nameIndex > -1 ? args[nameIndex + 1] : 'mookti-vectors';
      
      await indexer.createIndex(indexName);
      break;
    }

    default:
      console.error(`❌ Unknown command: ${command}`);
      process.exit(1);
  }
}

// Run if called directly
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export { ContentIndexer };