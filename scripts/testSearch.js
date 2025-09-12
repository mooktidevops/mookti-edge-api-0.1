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
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const API_URL = 'http://localhost:3000/api/search'; // For local testing
// const API_URL = 'https://mookti-edge-api-0-1.vercel.app/api/search'; // For production
// Test queries covering different domains
const TEST_QUERIES = [
    // Math/Calculus
    { query: 'What are limits in calculus?', expectedDomain: 'STEM', expectedSubdomain: 'Calculus' },
    { query: 'How do I find derivatives?', expectedDomain: 'STEM', expectedSubdomain: 'Calculus' },
    // Linear Algebra
    { query: 'matrix multiplication eigenvalues', expectedDomain: 'STEM', expectedSubdomain: 'Linear Algebra' },
    // Statistics
    { query: 'What is statistical hypothesis testing?', expectedDomain: 'STEM', expectedSubdomain: 'Statistics' },
    // Computer Science
    { query: 'sorting algorithms complexity', expectedDomain: 'STEM', expectedSubdomain: 'Computer Science' },
    // Physics
    { query: 'Newton laws of motion', expectedDomain: 'STEM', expectedSubdomain: 'Physics' },
    // Chemistry
    { query: 'chemical equilibrium reactions', expectedDomain: 'STEM', expectedSubdomain: 'Chemistry' },
    // Biology
    { query: 'DNA replication process', expectedDomain: 'STEM', expectedSubdomain: 'Biology' },
    // Economics
    { query: 'supply and demand elasticity', expectedDomain: 'Social Sciences', expectedSubdomain: 'Economics' },
    // General learning query
    { query: 'How do I learn effectively?', expectedDomain: null, expectedSubdomain: null },
];
async function testSearchAPI() {
    console.log('🔍 Testing Search API');
    console.log('='.repeat(60));
    console.log(`📍 API URL: ${API_URL}`);
    console.log(`🔑 Using local environment variables\n`);
    let successCount = 0;
    let failureCount = 0;
    for (const testCase of TEST_QUERIES) {
        console.log(`\n📝 Query: "${testCase.query}"`);
        console.log(`   Expected: ${testCase.expectedDomain || 'Any'} / ${testCase.expectedSubdomain || 'Any'}`);
        try {
            const startTime = Date.now();
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Note: In production, you'd need a proper Firebase auth token
                    'Authorization': 'Bearer test-token-for-local-development',
                },
                body: JSON.stringify({
                    query: testCase.query,
                    topK: 3,
                    includeUserDocs: false, // Only search public content for now
                }),
            });
            const elapsed = Date.now() - startTime;
            if (!response.ok) {
                const error = await response.text();
                console.log(`   ❌ Error (${response.status}): ${error}`);
                failureCount++;
                continue;
            }
            const data = await response.json();
            console.log(`   ✅ Success (${elapsed}ms)`);
            console.log(`   📊 Results: ${data.results?.length || 0} matches`);
            if (data.results && data.results.length > 0) {
                console.log('   📚 Top results:');
                data.results.slice(0, 3).forEach((result, i) => {
                    const metadata = result.metadata || {};
                    console.log(`      ${i + 1}. Score: ${result.score?.toFixed(3)}`);
                    console.log(`         Domain: ${metadata.domain || 'N/A'} / ${metadata.subdomain || 'N/A'}`);
                    console.log(`         Topic: ${metadata.title || metadata.topic_id || 'N/A'}`);
                    console.log(`         Type: ${metadata.chunk_type || 'N/A'}`);
                    // Show snippet of content
                    const text = result.content || metadata.text || '';
                    if (text) {
                        const snippet = text.substring(0, 100).replace(/\n/g, ' ');
                        console.log(`         Content: "${snippet}..."`);
                    }
                });
                // Check if expectations were met
                if (testCase.expectedDomain) {
                    const hasExpectedDomain = data.results.some((r) => r.metadata?.domain === testCase.expectedDomain);
                    if (hasExpectedDomain) {
                        console.log(`   ✅ Found expected domain: ${testCase.expectedDomain}`);
                    }
                    else {
                        console.log(`   ⚠️  Expected domain not in top results: ${testCase.expectedDomain}`);
                    }
                }
            }
            else {
                console.log('   ⚠️  No results returned');
            }
            successCount++;
        }
        catch (error) {
            console.log(`   ❌ Request failed: ${error}`);
            failureCount++;
        }
    }
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary:');
    console.log(`   ✅ Successful: ${successCount}/${TEST_QUERIES.length}`);
    console.log(`   ❌ Failed: ${failureCount}/${TEST_QUERIES.length}`);
    if (successCount === TEST_QUERIES.length) {
        console.log('\n🎉 All tests passed!');
    }
    else if (successCount > 0) {
        console.log('\n⚠️  Some tests failed - check the errors above');
    }
    else {
        console.log('\n❌ All tests failed - check API configuration');
    }
}
// Test direct Pinecone search (bypassing API)
async function testDirectPinecone() {
    console.log('\n\n🔍 Testing Direct Pinecone Search');
    console.log('='.repeat(60));
    const { Pinecone } = await Promise.resolve().then(() => __importStar(require('@pinecone-database/pinecone')));
    const { VoyageAIClient } = await Promise.resolve().then(() => __importStar(require('voyageai')));
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });
    const index = pinecone.index('mookti-vectors');
    const testQuery = 'What is calculus?';
    console.log(`📝 Test query: "${testQuery}"`);
    try {
        // Generate embedding
        console.log('🧮 Generating embedding...');
        const embeddingResponse = await voyage.embed({
            input: testQuery,
            model: 'voyage-large-2-instruct',
        });
        const queryEmbedding = embeddingResponse.data[0].embedding;
        console.log(`✅ Embedding generated (dimension: ${queryEmbedding?.length})`);
        // Search in public namespace
        console.log('🔍 Searching in "public" namespace...');
        const searchResponse = await index.namespace('public').query({
            vector: queryEmbedding,
            topK: 5,
            includeMetadata: true,
        });
        console.log(`✅ Found ${searchResponse.matches.length} matches\n`);
        if (searchResponse.matches.length > 0) {
            console.log('📚 Top results:');
            searchResponse.matches.forEach((match, i) => {
                console.log(`\n   ${i + 1}. ID: ${match.id}`);
                console.log(`      Score: ${match.score?.toFixed(3)}`);
                if (match.metadata) {
                    console.log(`      Domain: ${match.metadata.domain} / ${match.metadata.subdomain}`);
                    console.log(`      Title: ${match.metadata.title || match.metadata.topic_id}`);
                    console.log(`      Type: ${match.metadata.chunk_type}`);
                    const text = match.metadata.text;
                    if (text) {
                        const snippet = text.substring(0, 150).replace(/\n/g, ' ');
                        console.log(`      Content: "${snippet}..."`);
                    }
                }
            });
        }
    }
    catch (error) {
        console.error('❌ Direct search failed:', error);
    }
}
// Main execution
async function main() {
    const args = process.argv.slice(2);
    if (args.includes('--direct')) {
        // Test direct Pinecone access
        await testDirectPinecone();
    }
    else if (args.includes('--production')) {
        // Test production API
        console.log('🌐 Testing production API...');
        API_URL.replace('localhost:3000', 'mookti-edge-api-0-1.vercel.app');
        await testSearchAPI();
    }
    else {
        // Test local API
        console.log('🏠 Testing local API...');
        console.log('Make sure to run "npm run dev" in another terminal\n');
        await testSearchAPI();
    }
}
main().catch(console.error);
