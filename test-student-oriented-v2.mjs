#!/usr/bin/env node

/**
 * Test all 7 models with student-oriented questions
 * V2: Includes half-credit scoring for secondary intent matches
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
  { intent: 'understand', depth: 'guided', query: "I'm reading Romeo and Juliet for class - what's the main theme?", discipline: 'Literature' },
  { intent: 'evaluate', depth: 'guided', query: "I need to write an essay about postcolonial themes in Things Fall Apart - can you help me analyze them?", discipline: 'Literature' },
  { intent: 'create', depth: 'guided', query: "I'm trying to write a haiku about autumn for my poetry assignment", discipline: 'Creative Writing' },
  
  // HISTORY & SOCIAL STUDIES - Mix of styles
  { intent: 'understand', depth: 'guided', query: "Can you help me understand what caused the French Revolution? I have a test tomorrow", discipline: 'History' },
  { intent: 'explore', depth: 'guided', query: "I'm curious about the Renaissance - what was it like?", discipline: 'History' },
  { intent: 'understand', depth: 'guided', query: "Compare FDR's New Deal with Reagan's economic policies", discipline: 'Political Science' },
  
  // PSYCHOLOGY & MENTAL HEALTH - Student concerns
  { intent: 'regulate', depth: 'guided', query: "I have to present in front of the whole class tomorrow and I'm really anxious", discipline: 'Psychology' },
  { intent: 'understand', depth: 'guided', query: "I'm studying neuroscience - can you explain how addiction affects the brain's reward pathways?", discipline: 'Neuroscience' },
  { intent: 'regulate', depth: 'surface', query: "I keep procrastinating on my homework - any quick tips?", discipline: 'Psychology' },
  
  // BUSINESS & ECONOMICS - Student projects
  { intent: 'create', depth: 'guided', query: "I'm working on a business plan for my entrepreneurship class - it's for a coffee shop", discipline: 'Business' },
  { intent: 'evaluate', depth: 'guided', query: "My parents want me to invest my summer job savings - are bonds a good idea right now?", discipline: 'Finance' },
  { intent: 'understand', depth: 'guided', query: "I don't get supply and demand curves - can you explain with examples?", discipline: 'Economics' },
  
  // ARTS & MUSIC - Creative students
  { intent: 'create', depth: 'guided', query: "I'm composing a piece for my music theory class and want to use modal interchange - can we work through it?", discipline: 'Music Theory' },
  { intent: 'understand', depth: 'surface', query: "What's impressionism? I keep hearing about it in art class", discipline: 'Art History' },
  { intent: 'explore', depth: 'guided', query: "I'm interested in trying different pottery glazing techniques for my ceramics project", discipline: 'Ceramics' },
  
  // LANGUAGES & LINGUISTICS - Language learners
  { intent: 'understand', depth: 'guided', query: "I'm confused about when to use the subjunctive in Spanish - help!", discipline: 'Spanish' },
  { intent: 'understand', depth: 'surface', query: "How do I write 'hello, nice to meet you' in Japanese?", discipline: 'Japanese' },
  { intent: 'understand', depth: 'guided', query: "For my linguistics paper - how did Latin evolve into the Romance languages?", discipline: 'Linguistics' },
  
  // PHILOSOPHY & ETHICS - Curious students
  { intent: 'explore', depth: 'deep', query: "I've been thinking about free will vs determinism for my philosophy class - let's explore this", discipline: 'Philosophy' },
  { intent: 'undestand', depth: 'guided', query: "Can we discuss the trolley problem? I need to understand it for ethics class", discipline: 'Ethics' },
  { intent: 'evaluate', depth: 'deep', query: "Critique Kant's categorical imperative in modern contexts", discipline: 'Philosophy' },
  
  // HEALTH & MEDICINE - Health-conscious students
  { intent: 'understand', depth: 'surface', query: "My grandma has diabetes - what are the main symptoms I should know about?", discipline: 'Medicine' },
  { intent: 'organize', depth: 'guided', query: "I need a simple meal prep plan for my dorm room", discipline: 'Nutrition' },
  { intent: 'regulate', depth: 'guided', query: "I've been having trouble sleeping since finals started - what can I do?", discipline: 'Health' },
  
  // ENVIRONMENTAL SCIENCE - Eco-aware students
  { intent: 'explore', depth: 'guided', query: "I want to make my apartment more eco-friendly - what renewable energy options exist?", discipline: 'Environmental Science' },
  { intent: 'evaluate', depth: 'guided', query: "My friend says electric cars aren't actually better for the environment - is that true?", discipline: 'Environmental Science' },
  { intent: 'understand', depth: 'guided', query: "For my climate science project - explain the carbon cycle and ocean acidification", discipline: 'Climate Science' },
  
  // LAW & LEGAL STUDIES - Pre-law students
  { intent: 'understand', depth: 'guided', query: "I'm studying for the LSAT - can you explain civil vs criminal law?", discipline: 'Law' },
  { intent: 'understand', depth: 'guided', query: "My landlord won't return my deposit - what are my rights?", discipline: 'Law' },
  { intent: 'evaluate', depth: 'guided', query: "Analyze the constitutionality of government surveillance programs", discipline: 'Constitutional Law' },
  
  // EDUCATION & TEACHING - Future teachers
  { intent: 'create', depth: 'guided', query: "I'm student teaching next semester - help me design a curriculum for teaching critical thinking", discipline: 'Education' },
  { intent: 'regulate', depth: 'guided', query: "The kids in my tutoring group won't pay attention - what should I do?", discipline: 'Teaching' },
  { intent: 'create', depth: 'guided', query: "I need to create an engaging lesson about photosynthesis for 7th graders", discipline: 'Science Education' },
  
  // SOCIOLOGY & ANTHROPOLOGY - Social science students
  { intent: 'understand', depth: 'surface', query: "What's cultural relativism? It came up in my anthro reading", discipline: 'Anthropology' },
  { intent: 'explore', depth: 'deep', query: "I'm researching how social media affects teen identity for my sociology thesis", discipline: 'Sociology' },
  { intent: 'interact', depth: 'deep', query: "Let's debate nature vs nurture - I need different perspectives for my paper", discipline: 'Sociology' },
  
  // MATHEMATICS & STATISTICS - Math students
  { intent: 'solve', depth: 'guided', query: "How do I find the mean of this dataset: [23, 45, 67, 12, 89, 34]?", discipline: 'Statistics' },
  { intent: 'understand', depth: 'guided', query: "I'm stuck on quadratic equations - can you walk me through them?", discipline: 'Algebra' },
  { intent: 'create', depth: 'deep', query: "Help me develop a mathematical model for population growth in my research", discipline: 'Applied Math' },
  
  // PERSONAL DEVELOPMENT - Student life
  { intent: 'regulate', depth: 'surface', query: "I have 3 exams tomorrow and I need to focus NOW", discipline: 'Personal Development' },
  { intent: 'organize', depth: 'guided', query: "I'm graduating soon and thinking about becoming a teacher - how do I plan this transition?", discipline: 'Career Planning' },
  { intent: 'regulate', depth: 'deep', query: "Everyone in my program seems smarter than me - dealing with major imposter syndrome", discipline: 'Personal Development' },
  
  // AGRICULTURE & GARDENING - Practical students
  { intent: 'solve', depth: 'guided', query: "The tomatoes in my dorm garden have yellow leaves - what's wrong?", discipline: 'Gardening' },
  { intent: 'organize', depth: 'guided', query: "Plan a crop rotation for my community garden plot", discipline: 'Agriculture' },
  { intent: 'explore', depth: 'guided', query: "I'm interested in sustainable farming - can we explore permaculture?", discipline: 'Agriculture' },
  
  // CULINARY ARTS - Hungry students
  { intent: 'create', depth: 'guided', query: "I have chicken, rice, and some veggies - what can I make for dinner?", discipline: 'Cooking' },
  { intent: 'understand', depth: 'surface', query: "My culinary professor mentioned the Maillard reaction - what is it?", discipline: 'Food Science' },
  { intent: 'solve', depth: 'guided', query: "My sourdough starter isn't bubbling - how do I fix it?", discipline: 'Baking' },
  
  // SPORTS & FITNESS - Active students
  { intent: 'organize', depth: 'surface', query: "I only have 15 minutes between classes - need a quick workout", discipline: 'Fitness' },
  { intent: 'understand', depth: 'guided', query: "Can you check my deadlift form? I'll describe what I'm doing", discipline: 'Strength Training' },
  { intent: 'evaluate', depth: 'guided', query: "Review my marathon training plan - first race in 4 months", discipline: 'Running' },
  
  // COMPUTER SCIENCE - Tech students
  { intent: 'solve', depth: 'guided', query: "My code has a syntax error on line 42 - help!", discipline: 'Programming' },
  { intent: 'understand', depth: 'surface', query: "I'm learning recursion but it's confusing - can you explain it simply?", discipline: 'Computer Science' },
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
  console.log(`${colors.bright}${colors.cyan}Testing All 7 Models with Half-Credit Scoring${colors.reset}\n`);
  console.log(`${colors.cyan}Running ${testCases.length} diverse student queries${colors.reset}\n`);
  console.log(`${colors.yellow}NEW: Half credit (0.5 points) awarded if secondary intent matches expected${colors.reset}\n`);
  
  const models = [
    { name: 'Gemini 2.5 Flash', provider: 'google', id: 'gemini-2.5-flash' },
    { name: 'Gemini 2.5 Flash Lite', provider: 'google', id: 'gemini-2.5-flash-lite' },
    { name: 'Gemini 2.5 Pro', provider: 'google', id: 'gemini-2.5-pro' },
    { name: 'GPT-4o Mini', provider: 'openai', id: 'gpt-4o-mini' },
    { name: 'GPT-4o', provider: 'openai', id: 'gpt-4o' },
    { name: 'GPT-5-mini', provider: 'openai', id: 'gpt-4o-mini-2024-07-18' }, // Using exact model ID
    { name: 'GPT-5', provider: 'openai', id: 'gpt-5' },
    { name: 'Claude 3.5 Haiku', provider: 'anthropic', id: 'claude-3-5-haiku-20241022' },
    { name: 'Claude Sonnet 4', provider: 'anthropic', id: 'claude-sonnet-4-20250514' }
  ];
  
  const allResults = {};
  const csvRows = ['Query,Expected Intent,Expected Depth'];
  
  // Add model columns to CSV header
  models.forEach(m => {
    csvRows[0] += `,${m.name} Intent,${m.name} Intent Score,${m.name} Depth,${m.name} Overall Score`;
  });
  
  // Initialize result structure with new scoring
  models.forEach(m => {
    allResults[m.name] = {
      results: [],
      intentScore: 0,      // Now tracks points with half-credit
      depthScore: 0,       // Tracks depth points
      overallScore: 0,     // Combined score
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
          secondaryIntents: result.secondaryIntents || result.secondary_intents || result.secondary_learning_intents || [],
          depth: result.depth || result.engagementDepth || result.engagement_depth,
          confidence: result.confidence || result.confidenceLevel || result.confidence_level
        };
        
        // NEW SCORING LOGIC WITH HALF CREDIT
        let intentScore = 0;
        let depthScore = 0;
        
        // Check primary intent match
        if (normalized.primaryIntent === testCase.intent) {
          intentScore = 1;
        } 
        // Check if expected intent is in secondary intents (half credit)
        else if (Array.isArray(normalized.secondaryIntents) && 
                 normalized.secondaryIntents.includes(testCase.intent)) {
          intentScore = 0.5;
        }
        
        // Depth scoring (binary for now, but could be enhanced)
        if (normalized.depth === testCase.depth) {
          depthScore = 1;
        }
        
        // Update scores
        allResults[modelConfig.name].intentScore += intentScore;
        allResults[modelConfig.name].depthScore += depthScore;
        allResults[modelConfig.name].overallScore += (intentScore * depthScore); // Combined score
        
        console.log(`\nJSON Response:`);
        const jsonLines = JSON.stringify(result, null, 2).split('\n');
        jsonLines.forEach(line => console.log(`  ${colors.gray}${line}${colors.reset}`));
        
        console.log(`\nScoring:`);
        const intentSymbol = intentScore === 1 ? '✓ (1.0)' : intentScore === 0.5 ? '⚡ (0.5)' : '✗ (0.0)';
        const intentColor = intentScore === 1 ? colors.green : intentScore === 0.5 ? colors.yellow : colors.red;
        const depthSymbol = depthScore === 1 ? '✓ (1.0)' : '✗ (0.0)';
        const depthColor = depthScore === 1 ? colors.green : colors.red;
        
        console.log(`  Intent: ${intentColor}${intentSymbol} ${normalized.primaryIntent || 'ERROR'}${colors.reset}`);
        if (intentScore === 0.5) {
          console.log(`    ${colors.yellow}↳ Expected "${testCase.intent}" found in secondary intents${colors.reset}`);
        } else if (intentScore === 0) {
          console.log(`    ${colors.gray}↳ Expected: ${testCase.intent}${colors.reset}`);
        }
        console.log(`  Depth: ${depthColor}${depthSymbol} ${normalized.depth || 'ERROR'} (expected: ${testCase.depth})${colors.reset}`);
        console.log(`  Score: Intent=${intentScore}, Depth=${depthScore}, Combined=${intentScore * depthScore}`);
        
        allResults[modelConfig.name].results.push({
          query: testCase.query,
          expected: { intent: testCase.intent, depth: testCase.depth },
          result: normalized,
          intentScore,
          depthScore,
          overallScore: intentScore * depthScore,
          raw: result
        });
        
      } catch (error) {
        console.log(`\n${colors.red}ERROR: ${error.message}${colors.reset}`);
        allResults[modelConfig.name].errors++;
        allResults[modelConfig.name].results.push({
          query: testCase.query,
          expected: { intent: testCase.intent, depth: testCase.depth },
          error: error.message,
          intentScore: 0,
          depthScore: 0,
          overallScore: 0
        });
      }
      
      console.log(`${colors.gray}${'─'.repeat(80)}${colors.reset}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  // Generate CSV rows with new scoring
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    let row = `"${tc.query}",${tc.intent},${tc.depth}`;
    
    models.forEach(m => {
      const result = allResults[m.name].results[i];
      if (result && result.result) {
        row += `,${result.result.primaryIntent || 'ERROR'},${result.intentScore},${result.result.depth || 'ERROR'},${result.overallScore.toFixed(2)}`;
      } else {
        row += `,ERROR,0,ERROR,0`;
      }
    });
    
    csvRows.push(row);
  }
  
  // Add summary rows
  csvRows.push('');
  csvRows.push('SUMMARY SCORES,,,');
  
  let intentRow = 'Intent Score (with half-credit),,';
  let depthRow = 'Depth Score,,';
  let overallRow = 'Overall Score,,';
  
  models.forEach(m => {
    const stats = allResults[m.name];
    const intentPct = ((stats.intentScore / testCases.length) * 100).toFixed(1);
    const depthPct = ((stats.depthScore / testCases.length) * 100).toFixed(1);
    const overallPct = ((stats.overallScore / testCases.length) * 100).toFixed(1);
    
    intentRow += `,${intentPct}%,,,`;
    depthRow += `,${depthPct}%,,,`;
    overallRow += `,${overallPct}%,,,`;
  });
  
  csvRows.push(intentRow);
  csvRows.push(depthRow);
  csvRows.push(overallRow);
  
  // Save CSV
  fs.writeFileSync('student-oriented-v2-results.csv', csvRows.join('\n'));
  
  // Print final summary with new scoring
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}FINAL COMPARISON - ALL MODELS (WITH HALF-CREDIT SCORING)${colors.reset}`);
  console.log(`${'─'.repeat(80)}`);
  
  console.log(`\n${colors.bright}Scoring System:${colors.reset}`);
  console.log(`  • Primary Intent Match: 1.0 point`);
  console.log(`  • Secondary Intent Match: 0.5 points (half credit)`);
  console.log(`  • Depth Match: 1.0 point`);
  console.log(`  • Overall Score: Intent Score × Depth Score`);
  
  console.log(`\n${colors.bright}Model Performance:${colors.reset}`);
  
  // Sort models by overall score
  const sortedModels = Object.entries(allResults)
    .map(([name, stats]) => ({
      name,
      intentScore: stats.intentScore,
      depthScore: stats.depthScore,
      overallScore: stats.overallScore,
      errors: stats.errors
    }))
    .sort((a, b) => b.overallScore - a.overallScore);
  
  sortedModels.forEach((model, index) => {
    const intentPct = ((model.intentScore / testCases.length) * 100).toFixed(1);
    const depthPct = ((model.depthScore / testCases.length) * 100).toFixed(1);
    const overallPct = ((model.overallScore / testCases.length) * 100).toFixed(1);
    
    const color = overallPct >= 50 ? colors.green : overallPct >= 30 ? colors.yellow : colors.red;
    
    console.log(`\n${colors.bright}#${index + 1} ${model.name}:${colors.reset}`);
    console.log(`  Intent Score: ${colors.yellow}${intentPct}%${colors.reset} (${model.intentScore.toFixed(1)}/${testCases.length})`);
    console.log(`  Depth Score: ${colors.yellow}${depthPct}%${colors.reset} (${model.depthScore}/${testCases.length})`);
    console.log(`  Overall Score: ${color}${overallPct}%${colors.reset} (${model.overallScore.toFixed(1)}/${testCases.length})`);
    if (model.errors > 0) {
      console.log(`  ${colors.red}Errors: ${model.errors}${colors.reset}`);
    }
  });
  
  // Analyze secondary intent usage
  console.log(`\n${colors.bright}Secondary Intent Analysis:${colors.reset}`);
  models.forEach(m => {
    const halfCreditCount = allResults[m.name].results.filter(r => r.intentScore === 0.5).length;
    if (halfCreditCount > 0) {
      console.log(`  ${m.name}: ${halfCreditCount} half-credit matches (${((halfCreditCount/testCases.length)*100).toFixed(1)}%)`);
    }
  });
  
  // Save detailed JSON results
  fs.writeFileSync('student-oriented-v2-detailed.json', JSON.stringify(allResults, null, 2));
  
  console.log(`\n${colors.bright}Results saved to:${colors.reset}`);
  console.log(`  - student-oriented-v2-results.csv (for comparison)`);
  console.log(`  - student-oriented-v2-detailed.json (full data)`);
  
  console.log(`\n${colors.bright}${colors.cyan}Test Complete!${colors.reset}`);
}

// Run the test
testAllModels().catch(error => {
  console.error(`${colors.red}Test failed:${colors.reset}`, error);
  process.exit(1);
});