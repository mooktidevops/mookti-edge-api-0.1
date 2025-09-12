#!/usr/bin/env node

/**
 * Test all 7 models with student-oriented questions
 * Mix of conversational student queries and some direct commands
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import fs from 'fs';

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

// More realistic student queries - mix of conversational and direct
const testCases = [
  // HUMANITIES & LITERATURE - Student perspective
  { intent: 'understand', depth: 'surface', query: "I'm reading Romeo and Juliet for class - what's the main theme?", discipline: 'Literature' },
  { intent: 'evaluate', depth: 'deep', query: "I need to write an essay about postcolonial themes in Things Fall Apart - can you help me analyze them?", discipline: 'Literature' },
  { intent: 'create', depth: 'guided', query: "I'm trying to write a haiku about autumn for my poetry assignment", discipline: 'Creative Writing' },
  
  // HISTORY & SOCIAL STUDIES - Mix of styles
  { intent: 'understand', depth: 'guided', query: "Can you help me understand what caused the French Revolution? I have a test tomorrow", discipline: 'History' },
  { intent: 'explore', depth: 'surface', query: "I'm curious about the Renaissance - what was it like?", discipline: 'History' },
  { intent: 'evaluate', depth: 'guided', query: "Compare FDR's New Deal with Reagan's economic policies", discipline: 'Political Science' },
  
  // PSYCHOLOGY & MENTAL HEALTH - Student concerns
  { intent: 'regulate', depth: 'guided', query: "I have to present in front of the whole class tomorrow and I'm really anxious", discipline: 'Psychology' },
  { intent: 'understand', depth: 'deep', query: "I'm studying neuroscience - can you explain how addiction affects the brain's reward pathways?", discipline: 'Neuroscience' },
  { intent: 'solve', depth: 'surface', query: "I keep procrastinating on my homework - any quick tips?", discipline: 'Psychology' },
  
  // BUSINESS & ECONOMICS - Student projects
  { intent: 'organize', depth: 'guided', query: "I'm working on a business plan for my entrepreneurship class - it's for a coffee shop", discipline: 'Business' },
  { intent: 'evaluate', depth: 'surface', query: "My parents want me to invest my summer job savings - are bonds a good idea right now?", discipline: 'Finance' },
  { intent: 'understand', depth: 'guided', query: "I don't get supply and demand curves - can you explain with examples?", discipline: 'Economics' },
  
  // ARTS & MUSIC - Creative students
  { intent: 'create', depth: 'deep', query: "I'm composing a piece for my music theory class and want to use modal interchange - can we work through it?", discipline: 'Music Theory' },
  { intent: 'understand', depth: 'surface', query: "What's impressionism? I keep hearing about it in art class", discipline: 'Art History' },
  { intent: 'explore', depth: 'guided', query: "I'm interested in trying different pottery glazing techniques for my ceramics project", discipline: 'Ceramics' },
  
  // LANGUAGES & LINGUISTICS - Language learners
  { intent: 'solve', depth: 'guided', query: "I'm confused about when to use the subjunctive in Spanish - help!", discipline: 'Spanish' },
  { intent: 'create', depth: 'surface', query: "How do I write 'hello, nice to meet you' in Japanese?", discipline: 'Japanese' },
  { intent: 'understand', depth: 'deep', query: "For my linguistics paper - how did Latin evolve into the Romance languages?", discipline: 'Linguistics' },
  
  // PHILOSOPHY & ETHICS - Curious students
  { intent: 'explore', depth: 'deep', query: "I've been thinking about free will vs determinism for my philosophy class - let's explore this", discipline: 'Philosophy' },
  { intent: 'interact', depth: 'guided', query: "Can we discuss the trolley problem? I need to understand it for ethics class", discipline: 'Ethics' },
  { intent: 'evaluate', depth: 'deep', query: "Critique Kant's categorical imperative in modern contexts", discipline: 'Philosophy' },
  
  // HEALTH & MEDICINE - Health-conscious students
  { intent: 'understand', depth: 'surface', query: "My grandma has diabetes - what are the main symptoms I should know about?", discipline: 'Medicine' },
  { intent: 'organize', depth: 'surface', query: "I need a simple meal prep plan for my dorm room", discipline: 'Nutrition' },
  { intent: 'solve', depth: 'guided', query: "I've been having trouble sleeping since finals started - what can I do?", discipline: 'Health' },
  
  // ENVIRONMENTAL SCIENCE - Eco-aware students
  { intent: 'explore', depth: 'guided', query: "I want to make my apartment more eco-friendly - what renewable energy options exist?", discipline: 'Environmental Science' },
  { intent: 'evaluate', depth: 'surface', query: "My friend says electric cars aren't actually better for the environment - is that true?", discipline: 'Environmental Science' },
  { intent: 'understand', depth: 'deep', query: "For my climate science project - explain the carbon cycle and ocean acidification", discipline: 'Climate Science' },
  
  // LAW & LEGAL STUDIES - Pre-law students
  { intent: 'understand', depth: 'guided', query: "I'm studying for the LSAT - can you explain civil vs criminal law?", discipline: 'Law' },
  { intent: 'interact', depth: 'surface', query: "My landlord won't return my deposit - what are my rights?", discipline: 'Law' },
  { intent: 'evaluate', depth: 'guided', query: "Analyze the constitutionality of government surveillance programs", discipline: 'Constitutional Law' },
  
  // EDUCATION & TEACHING - Future teachers
  { intent: 'organize', depth: 'deep', query: "I'm student teaching next semester - help me design a curriculum for teaching critical thinking", discipline: 'Education' },
  { intent: 'solve', depth: 'guided', query: "The kids in my tutoring group won't pay attention - what should I do?", discipline: 'Teaching' },
  { intent: 'create', depth: 'guided', query: "I need to create an engaging lesson about photosynthesis for 7th graders", discipline: 'Science Education' },
  
  // SOCIOLOGY & ANTHROPOLOGY - Social science students
  { intent: 'understand', depth: 'surface', query: "What's cultural relativism? It came up in my anthro reading", discipline: 'Anthropology' },
  { intent: 'explore', depth: 'deep', query: "I'm researching how social media affects teen identity for my sociology thesis", discipline: 'Sociology' },
  { intent: 'interact', depth: 'deep', query: "Let's debate nature vs nurture - I need different perspectives for my paper", discipline: 'Sociology' },
  
  // MATHEMATICS & STATISTICS - Math students
  { intent: 'solve', depth: 'surface', query: "How do I find the mean of this dataset: [23, 45, 67, 12, 89, 34]?", discipline: 'Statistics' },
  { intent: 'understand', depth: 'guided', query: "I'm stuck on quadratic equations - can you walk me through them?", discipline: 'Algebra' },
  { intent: 'create', depth: 'deep', query: "Help me develop a mathematical model for population growth in my research", discipline: 'Applied Math' },
  
  // PERSONAL DEVELOPMENT - Student life
  { intent: 'regulate', depth: 'surface', query: "I have 3 exams tomorrow and I need to focus NOW", discipline: 'Personal Development' },
  { intent: 'organize', depth: 'guided', query: "I'm graduating soon and thinking about becoming a teacher - how do I plan this transition?", discipline: 'Career Planning' },
  { intent: 'regulate', depth: 'deep', query: "Everyone in my program seems smarter than me - dealing with major imposter syndrome", discipline: 'Personal Development' },
  
  // AGRICULTURE & GARDENING - Practical students
  { intent: 'solve', depth: 'surface', query: "The tomatoes in my dorm garden have yellow leaves - what's wrong?", discipline: 'Gardening' },
  { intent: 'organize', depth: 'guided', query: "Plan a crop rotation for my community garden plot", discipline: 'Agriculture' },
  { intent: 'explore', depth: 'guided', query: "I'm interested in sustainable farming - can we explore permaculture?", discipline: 'Agriculture' },
  
  // CULINARY ARTS - Hungry students
  { intent: 'create', depth: 'surface', query: "I have chicken, rice, and some veggies - what can I make for dinner?", discipline: 'Cooking' },
  { intent: 'understand', depth: 'guided', query: "My culinary professor mentioned the Maillard reaction - what is it?", discipline: 'Food Science' },
  { intent: 'solve', depth: 'guided', query: "My sourdough starter isn't bubbling - how do I fix it?", discipline: 'Baking' },
  
  // SPORTS & FITNESS - Active students
  { intent: 'organize', depth: 'surface', query: "I only have 15 minutes between classes - need a quick workout", discipline: 'Fitness' },
  { intent: 'interact', depth: 'guided', query: "Can you check my deadlift form? I'll describe what I'm doing", discipline: 'Strength Training' },
  { intent: 'evaluate', depth: 'guided', query: "Review my marathon training plan - first race in 4 months", discipline: 'Running' },
  
  // COMPUTER SCIENCE - Tech students
  { intent: 'solve', depth: 'surface', query: "My code has a syntax error on line 42 - help!", discipline: 'Programming' },
  { intent: 'understand', depth: 'guided', query: "I'm learning recursion but it's confusing - can you explain it simply?", discipline: 'Computer Science' },
  { intent: 'create', depth: 'deep', query: "I need to design a database schema for my capstone project", discipline: 'Database Design' },
  
  // PHYSICS & ENGINEERING - STEM students
  { intent: 'understand', depth: 'surface', query: "What's the difference between speed and velocity?", discipline: 'Physics' },
  { intent: 'solve', depth: 'guided', query: "I'm stuck on this thermodynamics problem about heat engines", discipline: 'Engineering' },
  { intent: 'explore', depth: 'deep', query: "I'm fascinated by quantum mechanics - let's explore the double-slit experiment", discipline: 'Physics' }
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

async function testAllModels() {
  console.log(`${colors.bright}${colors.cyan}Testing All 7 Models with Student-Oriented Questions${colors.reset}\n`);
  console.log(`${colors.cyan}Running ${testCases.length} diverse student queries${colors.reset}\n`);
  
  const models = [
    { name: 'Gemini 2.5 Flash', provider: 'google', id: 'gemini-2.5-flash' },
    { name: 'Gemini 2.5 Flash Lite', provider: 'google', id: 'gemini-2.5-flash-lite' },
    { name: 'Gemini 2.5 Pro', provider: 'google', id: 'gemini-2.5-pro' },
    { name: 'GPT-4o Mini', provider: 'openai', id: 'gpt-4o-mini' },
    { name: 'GPT-4o', provider: 'openai', id: 'gpt-4o' },
    { name: 'GPT-5', provider: 'openai', id: 'o1-preview' },
    { name: 'Claude 3.5 Haiku', provider: 'anthropic', id: 'claude-3-5-haiku-20241022' }
  ];
  
  const allResults = {};
  const csvRows = ['Query,Expected Intent,Expected Depth'];
  
  // Add model columns to CSV header
  models.forEach(m => {
    csvRows[0] += `,${m.name} Intent,${m.name} Depth`;
  });
  
  // Initialize result structure
  models.forEach(m => {
    allResults[m.name] = {
      results: [],
      correctIntent: 0,
      correctDepth: 0,
      correctBoth: 0,
      errors: 0
    };
  });
  
  // Test each model
  for (const modelConfig of models) {
    console.log(`\n${colors.bright}${colors.magenta}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.bright}Testing ${modelConfig.name}${colors.reset}\n`);
    
    let model;
    if (modelConfig.provider === 'google') {
      model = google(modelConfig.id);
    } else if (modelConfig.provider === 'openai') {
      model = openai(modelConfig.id);
    } else if (modelConfig.provider === 'anthropic') {
      model = anthropic(modelConfig.id);
    }
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      console.log(`\n${colors.bright}[${modelConfig.name} - Test ${i + 1}/${testCases.length}]${colors.reset} ${colors.yellow}${testCase.discipline}${colors.reset}`);
      console.log(`Query: "${colors.cyan}${testCase.query}${colors.reset}"`);
      console.log(`Expected: ${colors.yellow}${testCase.intent}/${testCase.depth}${colors.reset}`);
      
      try {
        const { text } = await generateText({
          model,
          system: systemPrompt,
          prompt: `Query: "${testCase.query}"\nContext: {}`,
          temperature: 0.3,
          maxRetries: 3,
          abortSignal: AbortSignal.timeout(30000) // 30 second timeout per request
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
        
        if (intentMatch) allResults[modelConfig.name].correctIntent++;
        if (depthMatch) allResults[modelConfig.name].correctDepth++;
        if (intentMatch && depthMatch) allResults[modelConfig.name].correctBoth++;
        
        console.log(`\nJSON Response:`);
        const jsonLines = JSON.stringify(result, null, 2).split('\n');
        jsonLines.forEach(line => console.log(`  ${colors.gray}${line}${colors.reset}`));
        
        console.log(`\nResults:`);
        console.log(`  Intent: ${intentMatch ? colors.green + '✓' : colors.red + '✗'} ${normalized.primaryIntent || 'ERROR'} (expected: ${testCase.intent})${colors.reset}`);
        console.log(`  Depth: ${depthMatch ? colors.green + '✓' : colors.red + '✗'} ${normalized.depth || 'ERROR'} (expected: ${testCase.depth})${colors.reset}`);
        
        allResults[modelConfig.name].results.push({
          query: testCase.query,
          expected: { intent: testCase.intent, depth: testCase.depth },
          result: normalized,
          intentMatch,
          depthMatch,
          raw: result
        });
        
      } catch (error) {
        console.log(`\n${colors.red}ERROR: ${error.message}${colors.reset}`);
        allResults[modelConfig.name].errors++;
        allResults[modelConfig.name].results.push({
          query: testCase.query,
          expected: { intent: testCase.intent, depth: testCase.depth },
          error: error.message
        });
      }
      
      console.log(`${colors.gray}${'─'.repeat(80)}${colors.reset}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  // Generate CSV rows
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    let row = `"${tc.query}",${tc.intent},${tc.depth}`;
    
    models.forEach(m => {
      const result = allResults[m.name].results[i];
      if (result && result.result) {
        row += `,${result.result.primaryIntent || 'ERROR'},${result.result.depth || 'ERROR'}`;
      } else {
        row += `,ERROR,ERROR`;
      }
    });
    
    csvRows.push(row);
  }
  
  // Add summary rows
  csvRows.push('');
  csvRows.push('SUMMARY SCORES,,,');
  
  let intentRow = 'Intent Accuracy (%),,';
  let depthRow = 'Depth Accuracy (%),,';
  let overallRow = 'Overall Accuracy (%),,';
  
  models.forEach(m => {
    const stats = allResults[m.name];
    const intentAcc = ((stats.correctIntent / testCases.length) * 100).toFixed(1);
    const depthAcc = ((stats.correctDepth / testCases.length) * 100).toFixed(1);
    const overallAcc = ((stats.correctBoth / testCases.length) * 100).toFixed(1);
    
    intentRow += `,${intentAcc},`;
    depthRow += `,${depthAcc},`;
    overallRow += `,${overallAcc},`;
  });
  
  csvRows.push(intentRow);
  csvRows.push(depthRow);
  csvRows.push(overallRow);
  
  // Save CSV
  fs.writeFileSync('student-oriented-results.csv', csvRows.join('\n'));
  
  // Print final summary
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}FINAL COMPARISON - ALL MODELS${colors.reset}`);
  console.log(`${'─'.repeat(80)}`);
  
  console.log(`\n${colors.bright}Accuracy Comparison:${colors.reset}`);
  models.forEach(m => {
    const stats = allResults[m.name];
    const intentAcc = ((stats.correctIntent / testCases.length) * 100).toFixed(1);
    const depthAcc = ((stats.correctDepth / testCases.length) * 100).toFixed(1);
    const overallAcc = ((stats.correctBoth / testCases.length) * 100).toFixed(1);
    
    const color = overallAcc >= 70 ? colors.green : overallAcc >= 50 ? colors.yellow : colors.red;
    console.log(`\n${colors.bright}${m.name}:${colors.reset}`);
    console.log(`  Intent: ${colors.yellow}${intentAcc}%${colors.reset} (${stats.correctIntent}/${testCases.length})`);
    console.log(`  Depth: ${colors.yellow}${depthAcc}%${colors.reset} (${stats.correctDepth}/${testCases.length})`);
    console.log(`  Overall: ${color}${overallAcc}%${colors.reset} (${stats.correctBoth}/${testCases.length})`);
    if (stats.errors > 0) {
      console.log(`  ${colors.red}Errors: ${stats.errors}${colors.reset}`);
    }
  });
  
  // Save detailed JSON results
  fs.writeFileSync('student-oriented-detailed.json', JSON.stringify(allResults, null, 2));
  
  console.log(`\n${colors.bright}Results saved to:${colors.reset}`);
  console.log(`  - student-oriented-results.csv (for comparison)`);
  console.log(`  - student-oriented-detailed.json (full data)`);
  
  console.log(`\n${colors.bright}${colors.cyan}Test Complete!${colors.reset}`);
}

// Run the test
testAllModels().catch(error => {
  console.error(`${colors.red}Test failed:${colors.reset}`, error);
  process.exit(1);
});