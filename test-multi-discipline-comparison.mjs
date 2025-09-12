#!/usr/bin/env node

/**
 * Multi-discipline model comparison for intent/depth classification
 * Tests across diverse academic and practical domains
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

// Diverse test suite across multiple disciplines
const testCases = [
  // HUMANITIES & LITERATURE
  { intent: 'understand', depth: 'surface', query: "What is the main theme of Romeo and Juliet?", discipline: 'Literature' },
  { intent: 'evaluate', depth: 'deep', query: "Analyze the postcolonial themes in Chinua Achebe's Things Fall Apart", discipline: 'Literature' },
  { intent: 'create', depth: 'guided', query: "Help me write a haiku about autumn leaves", discipline: 'Creative Writing' },
  
  // HISTORY & SOCIAL STUDIES
  { intent: 'understand', depth: 'guided', query: "Explain the causes of the French Revolution step by step", discipline: 'History' },
  { intent: 'explore', depth: 'surface', query: "What happened during the Renaissance period?", discipline: 'History' },
  { intent: 'evaluate', depth: 'guided', query: "Compare the economic policies of FDR and Reagan", discipline: 'Political Science' },
  
  // PSYCHOLOGY & MENTAL HEALTH
  { intent: 'regulate', depth: 'guided', query: "I'm anxious about my upcoming presentation", discipline: 'Psychology' },
  { intent: 'understand', depth: 'deep', query: "Explain the neurobiological basis of addiction and reward pathways", discipline: 'Neuroscience' },
  { intent: 'solve', depth: 'surface', query: "How can I stop procrastinating?", discipline: 'Psychology' },
  
  // BUSINESS & ECONOMICS
  { intent: 'organize', depth: 'guided', query: "Help me create a business plan for my coffee shop", discipline: 'Business' },
  { intent: 'evaluate', depth: 'surface', query: "Is now a good time to invest in bonds?", discipline: 'Finance' },
  { intent: 'understand', depth: 'guided', query: "Explain supply and demand curves with examples", discipline: 'Economics' },
  
  // ARTS & MUSIC
  { intent: 'create', depth: 'deep', query: "Let's compose a jazz progression using modal interchange", discipline: 'Music Theory' },
  { intent: 'understand', depth: 'surface', query: "What is impressionism in art?", discipline: 'Art History' },
  { intent: 'explore', depth: 'guided', query: "I want to explore different pottery glazing techniques", discipline: 'Ceramics' },
  
  // LANGUAGES & LINGUISTICS
  { intent: 'solve', depth: 'guided', query: "Help me understand when to use subjunctive mood in Spanish", discipline: 'Spanish' },
  { intent: 'create', depth: 'surface', query: "Write a simple greeting in Japanese", discipline: 'Japanese' },
  { intent: 'understand', depth: 'deep', query: "Analyze the phonological evolution from Latin to Romance languages", discipline: 'Linguistics' },
  
  // PHILOSOPHY & ETHICS
  { intent: 'explore', depth: 'deep', query: "Investigate the implications of determinism on free will", discipline: 'Philosophy' },
  { intent: 'interact', depth: 'guided', query: "Let's discuss the trolley problem and its variations", discipline: 'Ethics' },
  { intent: 'evaluate', depth: 'deep', query: "Critique Kant's categorical imperative in modern contexts", discipline: 'Philosophy' },
  
  // HEALTH & MEDICINE
  { intent: 'understand', depth: 'surface', query: "What are the symptoms of diabetes?", discipline: 'Medicine' },
  { intent: 'organize', depth: 'surface', query: "I need a quick meal prep plan for the week", discipline: 'Nutrition' },
  { intent: 'solve', depth: 'guided', query: "Help me improve my sleep schedule", discipline: 'Health' },
  
  // ENVIRONMENTAL SCIENCE
  { intent: 'explore', depth: 'guided', query: "Investigate renewable energy options for residential use", discipline: 'Environmental Science' },
  { intent: 'evaluate', depth: 'surface', query: "Are electric cars really better for the environment?", discipline: 'Environmental Science' },
  { intent: 'understand', depth: 'deep', query: "Explain the carbon cycle and ocean acidification mechanisms", discipline: 'Climate Science' },
  
  // LAW & LEGAL STUDIES
  { intent: 'understand', depth: 'guided', query: "Explain the difference between civil and criminal law", discipline: 'Law' },
  { intent: 'interact', depth: 'surface', query: "Can we briefly discuss tenant rights?", discipline: 'Law' },
  { intent: 'evaluate', depth: 'guided', query: "Analyze the constitutionality of surveillance programs", discipline: 'Constitutional Law' },
  
  // EDUCATION & PEDAGOGY
  { intent: 'organize', depth: 'deep', query: "Design a comprehensive curriculum for teaching critical thinking", discipline: 'Education' },
  { intent: 'solve', depth: 'guided', query: "How do I engage students who seem unmotivated?", discipline: 'Teaching' },
  { intent: 'create', depth: 'guided', query: "Help me develop an interactive lesson plan about photosynthesis", discipline: 'Science Education' },
  
  // SOCIOLOGY & ANTHROPOLOGY
  { intent: 'understand', depth: 'surface', query: "What is cultural relativism?", discipline: 'Anthropology' },
  { intent: 'explore', depth: 'deep', query: "Examine the impact of social media on identity formation", discipline: 'Sociology' },
  { intent: 'interact', depth: 'deep', query: "Let's debate nature versus nurture in human behavior", discipline: 'Sociology' },
  
  // MATHEMATICS & STATISTICS
  { intent: 'solve', depth: 'surface', query: "How do I calculate the mean of this dataset?", discipline: 'Statistics' },
  { intent: 'understand', depth: 'guided', query: "Walk me through solving quadratic equations", discipline: 'Algebra' },
  { intent: 'create', depth: 'deep', query: "Develop a mathematical model for population growth", discipline: 'Applied Math' },
  
  // PERSONAL DEVELOPMENT
  { intent: 'regulate', depth: 'surface', query: "I need to focus for my study session", discipline: 'Personal Development' },
  { intent: 'organize', depth: 'guided', query: "Help me plan my career transition to teaching", discipline: 'Career Planning' },
  { intent: 'regulate', depth: 'deep', query: "I'm struggling with imposter syndrome in my new role", discipline: 'Personal Development' },
  
  // AGRICULTURE & GARDENING
  { intent: 'solve', depth: 'surface', query: "Why are my tomato leaves turning yellow?", discipline: 'Gardening' },
  { intent: 'organize', depth: 'guided', query: "Plan a crop rotation schedule for my vegetable garden", discipline: 'Agriculture' },
  { intent: 'explore', depth: 'guided', query: "Explore permaculture principles for sustainable farming", discipline: 'Agriculture' },
  
  // CULINARY ARTS
  { intent: 'create', depth: 'surface', query: "Give me a quick recipe for dinner tonight", discipline: 'Cooking' },
  { intent: 'understand', depth: 'guided', query: "Explain the Maillard reaction in cooking", discipline: 'Food Science' },
  { intent: 'solve', depth: 'guided', query: "My bread isn't rising properly, help me troubleshoot", discipline: 'Baking' },
  
  // SPORTS & FITNESS
  { intent: 'organize', depth: 'surface', query: "I need a 15-minute morning workout routine", discipline: 'Fitness' },
  { intent: 'interact', depth: 'guided', query: "Let's work through proper deadlift form together", discipline: 'Strength Training' },
  { intent: 'evaluate', depth: 'guided', query: "Assess my marathon training plan for effectiveness", discipline: 'Running' }
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
      confidence: result.confidence || result.confidenceLevel || result.confidence_level,
      _raw: result  // Store raw response
    };
    
    return normalized;
  } catch (error) {
    return { error: error.message };
  }
}

async function runComparison() {
  console.log(`${colors.bright}${colors.cyan}Multi-Discipline Model Comparison${colors.reset}\n`);
  console.log(`${colors.cyan}Testing ${testCases.length} queries across diverse disciplines${colors.reset}\n`);
  
  const models = [
    { name: 'Gemini 2.5 Flash', model: 'gemini-2.5-flash', provider: 'google' },
    { name: 'Gemini 2.5 Pro', model: 'gemini-2.5-pro', provider: 'google' },
    { name: 'o4-mini', model: 'o4-mini', provider: 'openai' },
    { name: 'GPT-5-mini', model: 'gpt-5-mni', provider: 'openai' },
    { name: 'GPT-5', model: 'gpt-5', provider: 'openai' },
    { name: 'Claude Haiku 3.5', model: 'claude-3-5-haiku-20241022', provider: 'anthropic' }
  ];
  
  const results = {};
  const disciplineStats = {};
  
  for (const modelConfig of models) {
    console.log(`\n${colors.bright}${colors.blue}Testing ${modelConfig.name}${colors.reset}`);
    results[modelConfig.name] = [];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const result = await testModel(modelConfig, testCase);
      
      const intentMatch = result.primaryIntent === testCase.intent;
      const depthMatch = result.depth === testCase.depth;
      
      console.log(`\n${colors.bright}[Test ${i + 1}/${testCases.length}]${colors.reset} ${colors.yellow}${testCase.discipline}${colors.reset}`);
      console.log(`Expected: ${colors.yellow}${testCase.intent}/${testCase.depth}${colors.reset}`);
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
      
      results[modelConfig.name].push({ 
        intentMatch, 
        depthMatch,
        discipline: testCase.discipline,
        query: testCase.query,
        expected: `${testCase.intent}/${testCase.depth}`,
        actual: `${result.primaryIntent || 'ERROR'}/${result.depth || 'ERROR'}`
      });
      
      // Track discipline-specific accuracy
      if (!disciplineStats[testCase.discipline]) {
        disciplineStats[testCase.discipline] = {};
      }
      if (!disciplineStats[testCase.discipline][modelConfig.name]) {
        disciplineStats[testCase.discipline][modelConfig.name] = { correct: 0, total: 0 };
      }
      disciplineStats[testCase.discipline][modelConfig.name].total++;
      if (intentMatch && depthMatch) {
        disciplineStats[testCase.discipline][modelConfig.name].correct++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  // Summary
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}OVERALL SUMMARY${colors.reset}`);
  console.log(`${'─'.repeat(80)}`);
  console.log(`Model`.padEnd(20) + `Intent Acc.`.padEnd(15) + `Depth Acc.`.padEnd(15) + `Overall`);
  console.log(`${'─'.repeat(80)}`);
  
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
  
  // Discipline breakdown
  console.log(`\n${colors.bright}${colors.cyan}PERFORMANCE BY DISCIPLINE${colors.reset}`);
  console.log(`${'─'.repeat(80)}`);
  
  const disciplines = [...new Set(testCases.map(tc => tc.discipline))].sort();
  
  for (const discipline of disciplines) {
    console.log(`\n${colors.bright}${discipline}:${colors.reset}`);
    for (const modelName in disciplineStats[discipline]) {
      const stats = disciplineStats[discipline][modelName];
      const accuracy = (stats.correct / stats.total * 100).toFixed(0);
      const color = accuracy >= 70 ? colors.green : accuracy >= 50 ? colors.yellow : colors.red;
      console.log(`  ${modelName.padEnd(20)} ${color}${accuracy}%${colors.reset} (${stats.correct}/${stats.total})`);
    }
  }
  
  // Identify patterns
  console.log(`\n${colors.bright}${colors.cyan}COMMON PATTERNS${colors.reset}`);
  
  // Find queries that all models failed
  const allFailures = [];
  for (let i = 0; i < testCases.length; i++) {
    let allFailed = true;
    for (const modelName in results) {
      if (results[modelName][i].intentMatch && results[modelName][i].depthMatch) {
        allFailed = false;
        break;
      }
    }
    if (allFailed) {
      allFailures.push(testCases[i]);
    }
  }
  
  if (allFailures.length > 0) {
    console.log(`\n${colors.red}Queries where ALL models failed:${colors.reset}`);
    allFailures.forEach(tc => {
      console.log(`  [${tc.discipline}] "${tc.query}" (${tc.intent}/${tc.depth})`);
    });
  }
  
  // Find best performing disciplines
  const disciplineAverages = {};
  for (const discipline of disciplines) {
    let total = 0;
    let count = 0;
    for (const modelName in disciplineStats[discipline]) {
      const stats = disciplineStats[discipline][modelName];
      total += (stats.correct / stats.total);
      count++;
    }
    disciplineAverages[discipline] = (total / count * 100).toFixed(1);
  }
  
  const sortedDisciplines = Object.entries(disciplineAverages)
    .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]));
  
  console.log(`\n${colors.bright}Discipline Difficulty (Average Accuracy):${colors.reset}`);
  sortedDisciplines.slice(0, 5).forEach(([disc, acc]) => {
    console.log(`  ${colors.green}Easiest: ${disc} - ${acc}%${colors.reset}`);
  });
  sortedDisciplines.slice(-5).forEach(([disc, acc]) => {
    console.log(`  ${colors.red}Hardest: ${disc} - ${acc}%${colors.reset}`);
  });
}

// Run comparison
runComparison().catch(error => {
  console.error(`${colors.red}Test failed:${colors.reset}`, error);
  process.exit(1);
});