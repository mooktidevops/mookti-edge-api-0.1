#!/usr/bin/env node

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

interface EmbeddingChunk {
  id: string;
  text: string;
  type: string;
  metadata: any;
  embedding?: number[];
}

class EmbeddingGenerator {
  private voyage: VoyageAIClient;
  private outputDir: string = './embeddings_cache';

  constructor() {
    const apiKey = process.env.VOYAGE_API_KEY;
    if (!apiKey) {
      throw new Error('VOYAGE_API_KEY not found in environment variables');
    }
    this.voyage = new VoyageAIClient({ apiKey });
  }

  async generateEmbeddings(seedPath: string): Promise<void> {
    console.log('🚀 Starting embedding generation...');
    console.log(`📁 Input path: ${seedPath}`);
    
    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Find all JSONL files
    const jsonlFiles = this.findJsonlFiles(seedPath);
    console.log(`📁 Found ${jsonlFiles.length} JSONL files to process\n`);

    let totalChunks = 0;
    let totalCards = 0;

    for (const file of jsonlFiles) {
      const baseName = path.basename(file, '.jsonl');
      const outputFile = path.join(this.outputDir, `${baseName}_embeddings.jsonl`);
      
      console.log(`\n📄 Processing: ${path.basename(file)}`);
      
      const chunks = await this.processJsonlFile(file);
      totalCards += chunks.cardCount || 0;
      
      console.log(`  📝 Created ${chunks.chunks.length} chunks from ${chunks.cardCount} cards`);
      console.log(`  🧮 Generating embeddings...`);
      
      // Generate embeddings with progress tracking
      let processed = 0;
      const startTime = Date.now();
      
      for (const chunk of chunks.chunks) {
        try {
          const response = await this.voyage.embed({
            input: chunk.text,
            model: 'voyage-large-2-instruct',
          });
          
          chunk.embedding = response.data![0].embedding;
          processed++;
          
          // Show progress every 10 chunks
          if (processed % 10 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = processed / elapsed;
            console.log(`    ⏳ Progress: ${processed}/${chunks.chunks.length} chunks (${rate.toFixed(1)} chunks/sec)`);
          }
        } catch (error) {
          console.error(`    ❌ Error embedding chunk ${chunk.id}: ${error}`);
        }
      }
      
      // Save embeddings to file
      const output = fs.createWriteStream(outputFile);
      for (const chunk of chunks.chunks) {
        if (chunk.embedding) {
          output.write(JSON.stringify(chunk) + '\n');
        }
      }
      output.end();
      
      const elapsed = (Date.now() - startTime) / 1000;
      console.log(`  ✅ Generated ${processed} embeddings in ${elapsed.toFixed(1)}s`);
      console.log(`  💾 Saved to: ${outputFile}`);
      
      totalChunks += processed;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✨ Embedding generation complete!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total cards processed: ${totalCards}`);
    console.log(`   - Total chunks created: ${totalChunks}`);
    console.log(`   - Output directory: ${this.outputDir}`);
    console.log('\n📝 Next step: Run upload-embeddings to push to Pinecone');
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

  private async processJsonlFile(filePath: string): Promise<{ chunks: EmbeddingChunk[], cardCount: number }> {
    const chunks: EmbeddingChunk[] = [];
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

    let cardCount = 0;
    for (const line of lines) {
      try {
        const card: ContentCard = JSON.parse(line);
        cardCount++;
        const cardChunks = this.createChunksFromCard(card);
        chunks.push(...cardChunks);
      } catch (error) {
        console.error(`  ❌ Error processing line: ${error}`);
      }
    }

    return { chunks, cardCount };
  }

  private createChunksFromCard(card: ContentCard): EmbeddingChunk[] {
    const chunks: EmbeddingChunk[] = [];
    
    // Create metadata base
    const baseMetadata = {
      topic_id: card.topic_id,
      title: card.title,
      domain: card.domain,
      subdomain: card.subdomain,
      level: card.level,
      methods: Array.isArray(card.methods) ? card.methods.join(', ') : '',
      retrieval_queries: Array.isArray(card.retrieval_queries) ? card.retrieval_queries.join(' | ') : '',
      citations: Array.isArray(card.citations) ? 
        card.citations.map((c: any) => `${c.title || ''} - ${c.source || ''}`).filter(s => s !== ' - ').join(' | ') : '',
      license: card.license || 'CC-BY-4.0',
    };

    // Primer chunk
    chunks.push({
      id: `${card.topic_id}_primer`,
      text: `${card.title}\n\n${card.primer}`,
      type: 'primer',
      metadata: {
        ...baseMetadata,
        chunk_type: 'primer',
        text: `${card.title}\n\n${card.primer}`.substring(0, 1000),
      },
    });

    // Learning objectives chunk
    chunks.push({
      id: `${card.topic_id}_objectives`,
      text: `Learning objectives for ${card.title}:\n${card.learning_objectives.join('\n')}`,
      type: 'objectives',
      metadata: {
        ...baseMetadata,
        chunk_type: 'objectives',
        text: `Learning objectives for ${card.title}:\n${card.learning_objectives.join('\n')}`.substring(0, 1000),
      },
    });

    // Misconceptions chunks
    if (card.misconceptions && card.misconceptions.length > 0) {
      const misconceptionText = card.misconceptions
        .map((m, i) => `Misconception ${i + 1}: ${m.misconception}\nRefutation: ${m.refutation}\nExplanation: ${m.explanation}`)
        .join('\n\n');
      
      chunks.push({
        id: `${card.topic_id}_misconceptions`,
        text: misconceptionText,
        type: 'misconceptions',
        metadata: {
          ...baseMetadata,
          chunk_type: 'misconceptions',
          text: misconceptionText.substring(0, 1000),
        },
      });
    }

    // Quick check chunk
    if (card.quick_check && card.quick_check.length > 0) {
      const quickCheckText = card.quick_check
        .map((q, i) => `Question ${i + 1}: ${q.question}\nAnswer: ${q.answer}\nRationale: ${q.rationale}`)
        .join('\n\n');
      
      chunks.push({
        id: `${card.topic_id}_quick_check`,
        text: quickCheckText,
        type: 'quick_check',
        metadata: {
          ...baseMetadata,
          chunk_type: 'quick_check',
          text: quickCheckText.substring(0, 1000),
        },
      });
    }

    // Worked example chunk
    if (card.worked_example) {
      const exampleText = `Worked Example for ${card.title}:\n${
        card.worked_example.steps?.map((s: any) => `Step: ${s.step} - Why: ${s.why}`).join('\n')
      }`;
      
      chunks.push({
        id: `${card.topic_id}_example`,
        text: exampleText,
        type: 'worked_example',
        metadata: {
          ...baseMetadata,
          chunk_type: 'worked_example',
          text: exampleText.substring(0, 1000),
        },
      });
    }

    return chunks;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log(`
Usage: npm run generate-embeddings <path>

Generate embeddings for JSONL content files using Voyage AI.
Embeddings are saved locally for later upload to Pinecone.

Arguments:
  path    Path to directory containing JSONL files

Example:
  npm run generate-embeddings "../coaching-expansion/content_seeds/core"
    `);
    process.exit(1);
  }

  const seedPath = args[0];
  
  if (!fs.existsSync(seedPath)) {
    console.error(`❌ Path not found: ${seedPath}`);
    process.exit(1);
  }

  const generator = new EmbeddingGenerator();
  await generator.generateEmbeddings(seedPath);
}

// Run if called directly
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});