#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const pinecone_1 = require("@pinecone-database/pinecone");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const dotenv_1 = require("dotenv");
// Load environment variables
(0, dotenv_1.config)();
class EmbeddingUploader {
    pinecone;
    batchSize = 100;
    embeddingsDir = './embeddings_cache';
    constructor() {
        const apiKey = process.env.PINECONE_API_KEY;
        if (!apiKey) {
            throw new Error('PINECONE_API_KEY not found in environment variables');
        }
        this.pinecone = new pinecone_1.Pinecone({ apiKey });
    }
    async uploadEmbeddings(namespace = 'public') {
        console.log('🚀 Starting embedding upload to Pinecone...');
        console.log(`📍 Target namespace: ${namespace}`);
        console.log(`📁 Embeddings directory: ${this.embeddingsDir}`);
        // Check if embeddings directory exists
        if (!fs.existsSync(this.embeddingsDir)) {
            console.error(`❌ Embeddings directory not found: ${this.embeddingsDir}`);
            console.log('Please run generate-embeddings first');
            process.exit(1);
        }
        // Find all embedding files
        const embeddingFiles = fs.readdirSync(this.embeddingsDir)
            .filter(file => file.endsWith('_embeddings.jsonl'))
            .map(file => path.join(this.embeddingsDir, file));
        if (embeddingFiles.length === 0) {
            console.error('❌ No embedding files found');
            console.log('Please run generate-embeddings first');
            process.exit(1);
        }
        console.log(`📁 Found ${embeddingFiles.length} embedding files to upload\n`);
        const index = this.pinecone.index(process.env.PINECONE_INDEX_NAME || 'mookti-vectors');
        let totalVectors = 0;
        let totalSkipped = 0;
        for (const file of embeddingFiles) {
            console.log(`\n📄 Processing: ${path.basename(file)}`);
            const vectors = await this.loadEmbeddings(file);
            console.log(`  📊 Loaded ${vectors.length} vectors`);
            if (vectors.length > 0) {
                // Batch upsert vectors
                const startTime = Date.now();
                let uploaded = 0;
                for (let i = 0; i < vectors.length; i += this.batchSize) {
                    const batch = vectors.slice(i, i + this.batchSize);
                    try {
                        await index.namespace(namespace).upsert(batch);
                        uploaded += batch.length;
                        // Show progress
                        const progress = Math.round((uploaded / vectors.length) * 100);
                        const elapsed = (Date.now() - startTime) / 1000;
                        const rate = uploaded / elapsed;
                        console.log(`  ⬆️  Uploaded batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(vectors.length / this.batchSize)} (${progress}% @ ${rate.toFixed(1)} vectors/sec)`);
                    }
                    catch (error) {
                        console.error(`  ❌ Error uploading batch: ${error}`);
                        totalSkipped += batch.length;
                    }
                }
                const elapsed = (Date.now() - startTime) / 1000;
                console.log(`  ✅ Uploaded ${uploaded} vectors in ${elapsed.toFixed(1)}s`);
                totalVectors += uploaded;
            }
        }
        // Get final index stats
        console.log('\n' + '='.repeat(60));
        console.log('📊 Verifying upload...');
        try {
            const stats = await index.describeIndexStats();
            console.log(`\n✨ Upload complete!`);
            console.log(`📊 Summary:`);
            console.log(`   - Vectors uploaded: ${totalVectors}`);
            console.log(`   - Vectors skipped: ${totalSkipped}`);
            console.log(`   - Total vectors in index: ${stats.totalRecordCount}`);
            console.log(`   - Namespace "${namespace}": ${stats.namespaces?.[namespace]?.recordCount || 0} vectors`);
            if (stats.namespaces) {
                console.log(`\n📂 All namespaces:`);
                for (const [ns, data] of Object.entries(stats.namespaces)) {
                    console.log(`   - ${ns}: ${data.recordCount} vectors`);
                }
            }
        }
        catch (error) {
            console.error('❌ Failed to get index stats:', error);
        }
    }
    async loadEmbeddings(filePath) {
        const vectors = [];
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });
        for await (const line of rl) {
            if (line.trim()) {
                try {
                    const chunk = JSON.parse(line);
                    // Convert to Pinecone vector format
                    if (chunk.embedding && chunk.embedding.length > 0) {
                        vectors.push({
                            id: chunk.id,
                            values: chunk.embedding,
                            metadata: chunk.metadata,
                        });
                    }
                }
                catch (error) {
                    console.error(`  ⚠️  Error parsing line: ${error}`);
                }
            }
        }
        return vectors;
    }
    async clearNamespace(namespace) {
        console.log(`\n⚠️  Clearing namespace: ${namespace}`);
        const confirm = await this.promptUser('Are you sure? This will delete all vectors in this namespace (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
            console.log('Cancelled');
            return;
        }
        const index = this.pinecone.index(process.env.PINECONE_INDEX_NAME || 'mookti-vectors');
        try {
            await index.namespace(namespace).deleteAll();
            console.log(`✅ Namespace "${namespace}" cleared`);
        }
        catch (error) {
            console.error(`❌ Error clearing namespace: ${error}`);
        }
    }
    promptUser(question) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        return new Promise((resolve) => {
            rl.question(question, (answer) => {
                rl.close();
                resolve(answer);
            });
        });
    }
}
// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    if (!command || command === 'help') {
        console.log(`
Usage: npm run upload-embeddings [command] [options]

Commands:
  upload              Upload pre-generated embeddings to Pinecone (default)
  clear <namespace>   Clear all vectors from a namespace

Options:
  --namespace <name>  Target namespace (default: 'public')

Examples:
  npm run upload-embeddings                           # Upload to 'public' namespace
  npm run upload-embeddings -- --namespace remedial   # Upload to 'remedial' namespace
  npm run upload-embeddings clear public              # Clear the 'public' namespace
    `);
        process.exit(0);
    }
    const uploader = new EmbeddingUploader();
    if (command === 'clear') {
        const namespace = args[1] || 'public';
        await uploader.clearNamespace(namespace);
    }
    else {
        // Parse namespace option
        let namespace = 'public';
        const nsIndex = args.indexOf('--namespace');
        if (nsIndex !== -1 && args[nsIndex + 1]) {
            namespace = args[nsIndex + 1];
        }
        await uploader.uploadEmbeddings(namespace);
    }
}
// Run if called directly
main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
