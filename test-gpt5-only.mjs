#!/usr/bin/env node

import 'dotenv/config';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import fs from 'fs/promises';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

const testCases = [
  // LITERATURE & WRITING - Humanities students
  { intent: 'understand', depth: 'guided', query: "I'm reading Romeo and Juliet for class - what's the main theme?", discipline: 'Literature' },
  { intent: 'evaluate', depth: 'guided', query: "I need to write an essay about postcolonial themes in Things Fall Apart - can you help me analyze them?", discipline: 'Literature' },
  { intent: 'create', depth: 'guided', query: "I'm trying to write a haiku about autumn for my poetry assignment", discipline: 'Creative Writing' },
  
  // HISTORY & SOCIAL SCIENCES
  { intent: 'understand', depth: 'guided', query: "Can you help me understand what caused the French Revolution? I have a test tomorrow", discipline: 'History' },
  { intent: 'explore', depth: 'guided', query: "I'm curious about the Renaissance - what was it like?", discipline: 'History' },
  { intent: 'understand', depth: 'guided', query: "Compare FDR's New Deal with Reagan's economic policies", discipline: 'Political Science' },
  
  // PSYCHOLOGY & MENTAL HEALTH - Student wellness
  { intent: 'regulate', depth: 'guided', query: "I have to present in front of the whole class tomorrow and I'm really anxious", discipline: 'Psychology' },
  { intent: 'understand', depth: 'guided', query: "I'm studying neuroscience - can you explain how addiction affects the brain's reward pathways?", discipline: 'Neuroscience' },
  { intent: 'regulate', depth: 'surface', query: "I keep procrastinating on my homework - any quick tips?", discipline: 'Psychology' },
  
  // BUSINESS & ECONOMICS - Business students
  { intent: 'create', depth: 'guided', query: "I'm working on a business plan for my entrepreneurship class - it's for a coffee shop", discipline: 'Business' },
  { intent: 'evaluate', depth: 'guided', query: "My parents want me to invest my summer job savings - are bonds a good idea right now?", discipline: 'Finance' },
  { intent: 'understand', depth: 'guided', query: "I don't get supply and demand curves - can you explain with examples?", discipline: 'Economics' },
  
  // ARTS & MUSIC - Creative students
  { intent: 'create', depth: 'guided', query: "I'm composing a piece for my music theory class and want to use modal interchange - can we work through it?", discipline: 'Music Theory' },
  { intent: 'understand', depth: 'surface', query: "What's impressionism? I keep hearing about it in art class", discipline: 'Art History' },
  { intent: 'explore', depth: 'guided', query: "I'm interested in trying different pottery glazing techniques for my ceramics project", discipline: 'Ceramics' },
  
  // LANGUAGES - Language learners
  { intent: 'understand', depth: 'guided', query: "I'm confused about when to use the subjunctive in Spanish - help!", discipline: 'Spanish' },
  { intent: 'understand', depth: 'surface', query: "How do I write 'hello, nice to meet you' in Japanese?", discipline: 'Japanese' },
  { intent: 'understand', depth: 'guided', query: "For my linguistics paper - how did Latin evolve into the Romance languages?", discipline: 'Linguistics' },
  
  // PHILOSOPHY & ETHICS - Deep thinkers
  { intent: 'explore', depth: 'deep', query: "I've been thinking about free will vs determinism for my philosophy class - let's explore this", discipline: 'Philosophy' },
  { intent: 'understand', depth: 'guided', query: "Can we discuss the trolley problem? I need to understand it for ethics class", discipline: 'Ethics' },
  { intent: 'evaluate', depth: 'deep', query: "Critique Kant's categorical imperative in modern contexts", discipline: 'Philosophy' },
  
  // HEALTH & MEDICINE - Pre-med and health students
  { intent: 'understand', depth: 'surface', query: "My grandma has diabetes - what are the main symptoms I should know about?", discipline: 'Medicine' },
  { intent: 'organize', depth: 'guided', query: "I need a simple meal prep plan for my dorm room", discipline: 'Nutrition' },
  { intent: 'regulate', depth: 'guided', query: "I've been having trouble sleeping since finals started - what can I do?", discipline: 'Health' },
  
  // ENVIRONMENTAL SCIENCE - Eco-conscious students
  { intent: 'explore', depth: 'guided', query: "I want to make my apartment more eco-friendly - what renewable energy options exist?", discipline: 'Environmental Science' },
  { intent: 'evaluate', depth: 'guided', query: "My friend says electric cars aren't actually better for the environment - is that true?", discipline: 'Environmental Science' },
  { intent: 'understand', depth: 'guided', query: "For my climate science project - explain the carbon cycle and ocean acidification", discipline: 'Climate Science' },
  
  // LAW & POLITICS - Pre-law students
  { intent: 'understand', depth: 'guided', query: "I'm studying for the LSAT - can you explain civil vs criminal law?", discipline: 'Law' },
  { intent: 'understand', depth: 'guided', query: "My landlord won't return my deposit - what are my rights?", discipline: 'Law' },
  { intent: 'evaluate', depth: 'guided', query: "Analyze the constitutionality of government surveillance programs", discipline: 'Constitutional Law' },
  
  // EDUCATION & TEACHING - Future teachers
  { intent: 'create', depth: 'guided', query: "I'm student teaching next semester - help me design a curriculum for teaching critical thinking", discipline: 'Education' },
  { intent: 'regulate', depth: 'guided', query: "The kids in my tutoring group won't pay attention - what should I do?", discipline: 'Teaching' },
  { intent: 'create', depth: 'guided', query: "I need to create an engaging lesson about photosynthesis for 7th graders", discipline: 'Science Education' },
  
  // SOCIOLOGY & ANTHROPOLOGY - Social scientists
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

async function testGPT5Only() {
  console.log(`${colors.bright}${colors.cyan}Testing GPT-5 Model Only${colors.reset}\n`);
  console.log(`${colors.cyan}Running ${testCases.length} diverse student queries${colors.reset}\n`);
  
  const modelConfig = { name: 'GPT-5', provider: 'openai', id: 'gpt-5' };
  
  console.log(`${colors.bright}${colors.magenta}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}Testing ${modelConfig.name} (model: ${modelConfig.id})${colors.reset}\n`);
  
  const model = openai(modelConfig.id);
  const results = [];
  let intentScore = 0;
  let depthScore = 0;
  let errors = 0;
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`${colors.bright}[${modelConfig.name} - Test ${i+1}/${testCases.length}]${colors.reset} ${colors.yellow}${testCase.discipline}${colors.reset}`);
    console.log(`  Query: "${testCase.query.substring(0, 60)}..."`);
    
    try {
      const response = await generateText({
        model,
        system: systemPrompt,
        prompt: testCase.query,
        maxTokens: 200,
        temperature: 0.1,
        abortSignal: AbortSignal.timeout(120000)
      });
      
      let result;
      try {
        const cleanedText = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        result = JSON.parse(cleanedText);
      } catch (e) {
        console.log(`  ${colors.red}Failed to parse JSON response${colors.reset}`);
        errors++;
        continue;
      }
      
      // Normalize field names
      const normalized = {
        primaryIntent: result.primary_intent || result.primaryIntent || result.primary_learning_intent,
        secondaryIntents: result.secondary_intents || result.secondaryIntents || result.secondary_learning_intents || [],
        depth: result.engagement_depth || result.depth || result.engagementDepth,
        confidence: result.confidence || 0
      };
      
      // Calculate scores with half-credit
      let currentIntentScore = 0;
      let currentDepthScore = 0;
      
      if (normalized.primaryIntent === testCase.intent) {
        currentIntentScore = 1;
      } else if (Array.isArray(normalized.secondaryIntents) && 
                 normalized.secondaryIntents.includes(testCase.intent)) {
        currentIntentScore = 0.5;
      }
      
      if (normalized.depth === testCase.depth) {
        currentDepthScore = 1;
      }
      
      intentScore += currentIntentScore;
      depthScore += currentDepthScore;
      
      // Display result
      const intentIcon = currentIntentScore === 1 ? '✅' : currentIntentScore === 0.5 ? '⚡' : '❌';
      const depthIcon = currentDepthScore === 1 ? '✅' : '❌';
      
      console.log(`  Intent: ${intentIcon} ${normalized.primaryIntent} (expected: ${testCase.intent})`);
      if (currentIntentScore === 0.5) {
        console.log(`    ${colors.yellow}Half-credit: Found in secondary intents${colors.reset}`);
      }
      console.log(`  Depth: ${depthIcon} ${normalized.depth} (expected: ${testCase.depth})`);
      console.log(`  Overall: ${currentIntentScore && currentDepthScore ? '✅' : currentIntentScore === 0.5 && currentDepthScore ? '⚡' : '❌'}\n`);
      
      results.push({
        query: testCase.query,
        expected: { intent: testCase.intent, depth: testCase.depth },
        result: normalized,
        intentScore: currentIntentScore,
        depthScore: currentDepthScore,
        overallScore: currentIntentScore * currentDepthScore
      });
      
    } catch (error) {
      console.log(`  ${colors.red}ERROR: ${error.message}${colors.reset}\n`);
      errors++;
    }
  }
  
  // Calculate final scores
  const intentPercentage = ((intentScore / testCases.length) * 100).toFixed(1);
  const depthPercentage = ((depthScore / testCases.length) * 100).toFixed(1);
  const overallPercentage = (((intentScore * depthScore) / (testCases.length * testCases.length)) * 100).toFixed(1);
  
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}GPT-5 TEST RESULTS${colors.reset}\n`);
  
  console.log(`${colors.bright}Scores:${colors.reset}`);
  console.log(`  Intent Score (with half-credit): ${intentPercentage}%`);
  console.log(`  Depth Score: ${depthPercentage}%`);
  console.log(`  Overall Score: ${overallPercentage}%`);
  console.log(`  Errors: ${errors}/${testCases.length}`);
  
  // Save results
  await fs.writeFile(
    'gpt5-test-results.json',
    JSON.stringify({ model: modelConfig.name, results, scores: { intent: intentPercentage, depth: depthPercentage, overall: overallPercentage, errors } }, null, 2)
  );
  
  console.log(`\n${colors.green}Results saved to gpt5-test-results.json${colors.reset}`);
}

// Run the test
testGPT5Only().catch(console.error);