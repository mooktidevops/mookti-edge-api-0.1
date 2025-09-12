#!/usr/bin/env node

/**
 * Test Gemini 2.5 Flash Lite model specifically
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateText } from 'ai';
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

// Use the same diverse test suite
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

async function testGeminiFlashLite() {
  console.log(`${colors.bright}${colors.cyan}Testing Gemini 2.5 Flash Lite Model${colors.reset}\n`);
  console.log(`${colors.cyan}Running ${testCases.length} diverse queries across all disciplines${colors.reset}\n`);
  
  const model = google('gemini-2.5-flash-lite');
  const results = [];
  const startTime = Date.now();
  
  let correctIntent = 0;
  let correctDepth = 0;
  let correctBoth = 0;
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    console.log(`\n${colors.bright}[Test ${i + 1}/${testCases.length}]${colors.reset} ${colors.yellow}${testCase.discipline}${colors.reset}`);
    console.log(`Expected: ${colors.yellow}${testCase.intent}/${testCase.depth}${colors.reset}`);
    console.log(`Query: "${colors.cyan}${testCase.query}${colors.reset}"`);
    
    try {
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
      
      // Handle different field names
      const normalized = {
        primaryIntent: result.primaryIntent || result.primary_intent || result.primary_learning_intent || result.intent,
        depth: result.depth || result.engagementDepth || result.engagement_depth,
        confidence: result.confidence || result.confidenceLevel || result.confidence_level
      };
      
      const intentMatch = normalized.primaryIntent === testCase.intent;
      const depthMatch = normalized.depth === testCase.depth;
      
      if (intentMatch) correctIntent++;
      if (depthMatch) correctDepth++;
      if (intentMatch && depthMatch) correctBoth++;
      
      console.log(`\nJSON Response:`);
      const jsonLines = JSON.stringify(result, null, 2).split('\n');
      jsonLines.forEach(line => console.log(`  ${colors.gray}${line}${colors.reset}`));
      
      console.log(`\nClassification Results:`);
      console.log(`  Intent: ${intentMatch ? colors.green + '✓' : colors.red + '✗'} ${normalized.primaryIntent || 'ERROR'} (expected: ${testCase.intent})`);
      console.log(`  Depth: ${depthMatch ? colors.green + '✓' : colors.red + '✗'} ${normalized.depth || 'ERROR'} (expected: ${testCase.depth})`);
      if (normalized.confidence !== undefined) {
        console.log(`  Confidence: ${normalized.confidence}`);
      }
      
      results.push({
        testCase,
        result: normalized,
        intentMatch,
        depthMatch
      });
      
    } catch (error) {
      console.log(`\n${colors.red}ERROR: ${error.message}${colors.reset}`);
      results.push({
        testCase,
        error: error.message,
        intentMatch: false,
        depthMatch: false
      });
    }
    
    console.log(`${colors.gray}${'─'.repeat(80)}${colors.reset}`);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Calculate and display summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);
  
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}GEMINI 2.5 FLASH LITE - FINAL RESULTS${colors.reset}`);
  console.log(`${'─'.repeat(80)}`);
  
  const intentAccuracy = ((correctIntent / testCases.length) * 100).toFixed(1);
  const depthAccuracy = ((correctDepth / testCases.length) * 100).toFixed(1);
  const overallAccuracy = ((correctBoth / testCases.length) * 100).toFixed(1);
  
  console.log(`Test Duration: ${duration} seconds`);
  console.log(`Total Tests: ${testCases.length}`);
  console.log(`\nAccuracy Metrics:`);
  console.log(`  Intent Classification: ${colors.yellow}${intentAccuracy}%${colors.reset} (${correctIntent}/${testCases.length})`);
  console.log(`  Depth Classification: ${colors.yellow}${depthAccuracy}%${colors.reset} (${correctDepth}/${testCases.length})`);
  
  const overallColor = overallAccuracy >= 70 ? colors.green : overallAccuracy >= 50 ? colors.yellow : colors.red;
  console.log(`  Overall Accuracy: ${overallColor}${overallAccuracy}%${colors.reset} (${correctBoth}/${testCases.length})`);
  
  // Analyze by discipline
  const disciplineStats = {};
  results.forEach(r => {
    const disc = r.testCase.discipline;
    if (!disciplineStats[disc]) {
      disciplineStats[disc] = { correct: 0, total: 0 };
    }
    disciplineStats[disc].total++;
    if (r.intentMatch && r.depthMatch) {
      disciplineStats[disc].correct++;
    }
  });
  
  console.log(`\n${colors.bright}Performance by Discipline:${colors.reset}`);
  const sortedDisciplines = Object.entries(disciplineStats)
    .sort((a, b) => (b[1].correct/b[1].total) - (a[1].correct/a[1].total));
  
  sortedDisciplines.forEach(([disc, stats]) => {
    const acc = ((stats.correct / stats.total) * 100).toFixed(0);
    const color = acc >= 70 ? colors.green : acc >= 50 ? colors.yellow : colors.red;
    console.log(`  ${disc.padEnd(25)} ${color}${acc}%${colors.reset} (${stats.correct}/${stats.total})`);
  });
  
  // Common failures
  const failures = results.filter(r => !r.intentMatch || !r.depthMatch);
  if (failures.length > 0) {
    console.log(`\n${colors.bright}Most Common Misclassifications:${colors.reset}`);
    const failureTypes = {};
    failures.forEach(f => {
      if (!f.intentMatch) {
        const key = `Intent: ${f.testCase.intent} → ${f.result?.primaryIntent || 'ERROR'}`;
        failureTypes[key] = (failureTypes[key] || 0) + 1;
      }
      if (!f.depthMatch) {
        const key = `Depth: ${f.testCase.depth} → ${f.result?.depth || 'ERROR'}`;
        failureTypes[key] = (failureTypes[key] || 0) + 1;
      }
    });
    
    Object.entries(failureTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([pattern, count]) => {
        console.log(`  ${pattern} (${count} times)`);
      });
  }
  
  console.log(`\n${colors.bright}${colors.cyan}Test Complete!${colors.reset}`);
}

// Run the test
testGeminiFlashLite().catch(error => {
  console.error(`${colors.red}Test failed:${colors.reset}`, error);
  process.exit(1);
});