#!/usr/bin/env node

/**
 * Simple model comparison for intent/depth classification
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
};

// Full test suite - all 24 combinations
const testCases = [
  // Understand
  { intent: 'understand', depth: 'surface', query: "What is machine learning?" },
  { intent: 'understand', depth: 'guided', query: "Can you explain how neural networks work step by step?" },
  { intent: 'understand', depth: 'deep', query: "I want to understand the mathematical foundations of backpropagation in deep learning" },
  
  // Create
  { intent: 'create', depth: 'surface', query: "Help me write a quick thank you email" },
  { intent: 'create', depth: 'guided', query: "I need to design a REST API for my project" },
  { intent: 'create', depth: 'deep', query: "Let's create a comprehensive system architecture for a distributed application" },
  
  // Solve
  { intent: 'solve', depth: 'surface', query: "How do I fix this syntax error?" },
  { intent: 'solve', depth: 'guided', query: "Help me debug this sorting algorithm that's not working correctly" },
  { intent: 'solve', depth: 'deep', query: "I need to solve this complex optimization problem with multiple constraints" },
  
  // Evaluate
  { intent: 'evaluate', depth: 'surface', query: "Is MongoDB a good choice?" },
  { intent: 'evaluate', depth: 'guided', query: "Review my code and suggest improvements" },
  { intent: 'evaluate', depth: 'deep', query: "Critically analyze this system design for scalability and security" },
  
  // Organize
  { intent: 'organize', depth: 'surface', query: "I need a quick study plan for tomorrow" },
  { intent: 'organize', depth: 'guided', query: "Help me plan my learning path for web development" },
  { intent: 'organize', depth: 'deep', query: "Create a comprehensive project timeline with milestones and dependencies" },
  
  // Regulate
  { intent: 'regulate', depth: 'surface', query: "I need to focus for 30 minutes" },
  { intent: 'regulate', depth: 'guided', query: "I'm feeling overwhelmed with this project" },
  { intent: 'regulate', depth: 'deep', query: "I keep hitting mental blocks and need strategies to breakthrough" },
  
  // Explore
  { intent: 'explore', depth: 'surface', query: "What's the history of AI?" },
  { intent: 'explore', depth: 'guided', query: "Let me explore different approaches to solving this problem" },
  { intent: 'explore', depth: 'deep', query: "I want to investigate the theoretical implications of quantum computing" },
  
  // Interact
  { intent: 'interact', depth: 'surface', query: "Can we discuss this briefly?" },
  { intent: 'interact', depth: 'guided', query: "Let's work through this problem together step by step" },
  { intent: 'interact', depth: 'deep', query: "I want to debate the pros and cons of different architectural patterns" }
];

const systemPrompt = `You are an intent router for an educational AI system.
    
Analyze the user's query and determine:
1. Primary learning intent (understand, create, solve, evaluate, organize, regulate, explore, interact)
2. Any secondary intents if present
3. Engagement depth (surface: <2min quick answer, guided: 5-15min learning, deep: 15+ min exploration)
4. Confidence level (0-1)

Intent Definitions:
- understand: Seeking knowledge or comprehension
- create: Building, writing, or producing something
- solve: Working through problems or challenges
- evaluate: Assessing, reviewing, or making decisions
- organize: Planning, structuring, or managing
- regulate: Managing emotions, focus, or motivation
- explore: Open-ended discovery or investigation
- interact: Collaboration or discussion needs

Return JSON only.`;

async function testModel(modelConfig, testCase) {
  try {
    let model;
    if (modelConfig.provider === 'openai') {
      model = openai(modelConfig.model);
    } else if (modelConfig.provider === 'anthropic') {
      model = anthropic(modelConfig.model);
    } else if (modelConfig.provider === 'google') {
      model = google(modelConfig.model);
    }
    
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: `Query: "${testCase.query}"\nContext: {}`,
      temperature: 0.3
    });
    
    // Clean up markdown-wrapped JSON if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const result = JSON.parse(cleanedText);
    
    // Handle different field names from different models
    const normalized = {
      primaryIntent: result.primaryIntent || result.primary_intent || result.primary_learning_intent || result.intent,
      depth: result.depth || result.engagementDepth || result.engagement_depth,
      confidence: result.confidence || result.confidenceLevel || result.confidence_level || result.confidence,
      _raw: result  // Store raw response
    };
    
    return normalized;
  } catch (error) {
    return { error: error.message };
  }
}

async function runComparison() {
  console.log(`${colors.bright}${colors.cyan}Model Comparison for Intent Classification${colors.reset}\n`);
  
  const models = [
    { name: 'Gemini 2.5 Flash', model: 'gemini-2.5-flash', provider: 'google' },
    { name: 'Gemini 2.5 Pro', model: 'gemini-2.5-pro', provider: 'google' },
    { name: 'o4-mini', model: 'o4-mini', provider: 'openai' },
    { name: 'GPT-5-mini', model: 'gpt-5-mini', provider: 'openai' },
    { name: 'GPT-5', model: 'gpt-5', provider: 'openai' },
    { name: 'Claude Haiku 3.5', model: 'claude-3-5-haiku-20241022', provider: 'anthropic' }
  ];
  
  const results = {};
  
  for (const modelConfig of models) {
    console.log(`\n${colors.bright}${colors.blue}Testing ${modelConfig.name}${colors.reset}`);
    results[modelConfig.name] = [];
    
    for (const testCase of testCases) {
      const result = await testModel(modelConfig, testCase);
      
      const intentMatch = result.primaryIntent === testCase.intent;
      const depthMatch = result.depth === testCase.depth;
      
      console.log(`\n${colors.bright}[Test ${testCases.indexOf(testCase) + 1}/24]${colors.reset} Expected: ${colors.yellow}${testCase.intent}/${testCase.depth}${colors.reset}`);
      console.log(`Query: "${colors.cyan}${testCase.query}${colors.reset}"`);
      
      // Show both raw and normalized response
      if (!result.error) {
        console.log(`\nJSON Response:`);
        const jsonLines = JSON.stringify(result._raw, null, 2).split('\n');
        jsonLines.forEach(line => console.log(`  ${colors.gray}${line}${colors.reset}`));
        
        console.log(`\nClassification Results:`);
        console.log(`  Intent: ${intentMatch ? colors.green + '✓' : colors.red + '✗'} ${result.primaryIntent || 'ERROR'} (expected: ${testCase.intent})`);
        console.log(`  Depth: ${depthMatch ? colors.green + '✓' : colors.red + '✗'} ${result.depth || 'ERROR'} (expected: ${testCase.depth})`);
        if (result.confidence !== undefined) {
          console.log(`  Confidence: ${result.confidence}`);
        }
      } else {
        console.log(`\n${colors.red}ERROR: ${result.error}${colors.reset}`);
        console.log(`  Intent: ${colors.red}✗ ERROR`);
        console.log(`  Depth: ${colors.red}✗ ERROR`);
      }
      
      console.log(`${colors.gray}${'─'.repeat(80)}${colors.reset}`);
      
      results[modelConfig.name].push({ intentMatch, depthMatch });
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Summary
  console.log(`\n${colors.bright}${colors.cyan}SUMMARY${colors.reset}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`Model`.padEnd(20) + `Intent Acc.`.padEnd(15) + `Depth Acc.`.padEnd(15) + `Overall`);
  console.log(`${'─'.repeat(60)}`);
  
  for (const modelName in results) {
    const modelResults = results[modelName];
    const intentAcc = (modelResults.filter(r => r.intentMatch).length / modelResults.length * 100).toFixed(1);
    const depthAcc = (modelResults.filter(r => r.depthMatch).length / modelResults.length * 100).toFixed(1);
    const overall = (modelResults.filter(r => r.intentMatch && r.depthMatch).length / modelResults.length * 100).toFixed(1);
    
    const color = overall >= 70 ? colors.green : overall >= 50 ? colors.yellow : colors.red;
    console.log(
      `${modelName.padEnd(20)}` +
      `${intentAcc}%`.padEnd(15) +
      `${depthAcc}%`.padEnd(15) +
      `${color}${overall}%${colors.reset}`
    );
  }
}

runComparison().catch(console.error);