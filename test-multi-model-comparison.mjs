#!/usr/bin/env node

/**
 * Test intent/depth classification across multiple LLM models
 * Compares accuracy and behavior differences
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

// Color codes
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

// Models to test
const models = [
  { name: 'Gemini Flash (Default)', model: 'gemini-1.5-flash-latest', provider: 'google' },
  { name: 'GPT-4o-mini', model: 'gpt-4o-mini', provider: 'openai' },
  { name: 'Claude Haiku 3.5', model: 'claude-3-5-haiku-20241022', provider: 'anthropic' },
  { name: 'Gemini 2.0 Flash', model: 'gemini-2.0-flash-exp', provider: 'google' },
  { name: 'o1-mini', model: 'o1-mini', provider: 'openai' }
];

// Subset of test cases for comparison
const testCases = [
  { 
    intent: 'understand', 
    depth: 'surface', 
    query: "What is machine learning?",
    description: "Simple definition request"
  },
  { 
    intent: 'create', 
    depth: 'surface', 
    query: "Help me write a quick thank you email to my professor",
    description: "Writing assistance"
  },
  { 
    intent: 'solve', 
    depth: 'guided', 
    query: "Help me debug this sorting algorithm that's producing incorrect results",
    description: "Problem solving"
  },
  { 
    intent: 'evaluate', 
    depth: 'surface', 
    query: "Is using MongoDB a good choice for this project?",
    description: "Quick evaluation"
  },
  { 
    intent: 'organize', 
    depth: 'guided', 
    query: "Help me plan my learning path for becoming a full-stack developer",
    description: "Planning/organizing"
  },
  { 
    intent: 'regulate', 
    depth: 'guided', 
    query: "I'm feeling overwhelmed with this project and don't know where to start",
    description: "Emotional regulation"
  },
  { 
    intent: 'explore', 
    depth: 'deep', 
    query: "I want to investigate the theoretical implications of quantum computing on cryptography",
    description: "Deep exploration"
  },
  { 
    intent: 'interact', 
    depth: 'guided', 
    query: "Let's work through this algorithm problem together step by step",
    description: "Collaborative interaction"
  }
];

async function testWithModel(modelConfig, testCase) {
  // Import and modify the intent router to use specific model
  const code = `
    import { generateText } from 'ai';
    import { ${modelConfig.provider === 'openai' ? 'openai' : modelConfig.provider === 'anthropic' ? 'anthropic' : 'google'} } from '@ai-sdk/${modelConfig.provider}';
    
    const systemPrompt = \`You are an intent router for an educational AI system.
    
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

Return JSON only.\`;

    const query = "${testCase.query.replace(/"/g, '\\"')}";
    
    try {
      const modelInstance = ${modelConfig.provider === 'openai' ? 'openai' : modelConfig.provider === 'anthropic' ? 'anthropic' : 'google'}('${modelConfig.model}');
      const { text } = await generateText({
        model: modelInstance,
        system: systemPrompt,
        prompt: \`Query: "\${query}"\\nContext: {}\`,
        temperature: 0.3
      });
      
      const result = JSON.parse(text);
      console.log(JSON.stringify(result));
    } catch (error) {
      console.log(JSON.stringify({ error: error.message }));
    }
  `;
  
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync(`node -e "${code.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
      timeout: 30000
    });
    
    return JSON.parse(stdout);
  } catch (error) {
    return { error: error.message };
  }
}

async function runModelComparison() {
  console.log(`${colors.bright}${colors.cyan}Multi-Model Intent Classification Comparison${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
  
  const results = {};
  
  for (const modelConfig of models) {
    console.log(`\n${colors.bright}${colors.blue}Testing with ${modelConfig.name}${colors.reset}`);
    console.log(`${colors.gray}Model: ${modelConfig.model}${colors.reset}\n`);
    
    results[modelConfig.name] = [];
    
    for (const testCase of testCases) {
      console.log(`${colors.bright}[${testCase.intent}/${testCase.depth}]${colors.reset} ${testCase.description}`);
      console.log(`${colors.gray}Query: "${testCase.query}"${colors.reset}`);
      
      const result = await testWithModel(modelConfig, testCase);
      
      const intentMatch = result.primaryIntent === testCase.intent;
      const depthMatch = result.depth === testCase.depth;
      
      console.log(`\nLLM Response:`);
      console.log(`  ${colors.magenta}${JSON.stringify(result, null, 2).split('\n').join('\n  ')}${colors.reset}`);
      
      console.log(`\nAnalysis:`);
      console.log(`  Intent: ${intentMatch ? colors.green : colors.red}${result.primaryIntent || 'ERROR'}${colors.reset} (expected: ${testCase.intent})`);
      console.log(`  Depth: ${depthMatch ? colors.green : colors.red}${result.depth || 'ERROR'}${colors.reset} (expected: ${testCase.depth})`);
      
      if (result.confidence !== undefined) {
        console.log(`  Confidence: ${result.confidence}`);
      }
      
      if (result.reasoning) {
        console.log(`  Reasoning: ${colors.gray}${result.reasoning}${colors.reset}`);
      }
      
      const status = intentMatch && depthMatch ? 
        `${colors.green}✅ CORRECT` : 
        intentMatch ? `${colors.yellow}⚠ PARTIAL` : 
        `${colors.red}❌ INCORRECT`;
      console.log(`  Status: ${status}${colors.reset}`);
      
      results[modelConfig.name].push({
        testCase: `${testCase.intent}/${testCase.depth}`,
        intentMatch,
        depthMatch,
        response: result
      });
      
      console.log(`${colors.gray}${'─'.repeat(80)}${colors.reset}\n`);
      
      // Small delay between API calls
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Summary comparison
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}MODEL COMPARISON SUMMARY${colors.reset}\n`);
  
  // Calculate accuracy for each model
  const modelScores = {};
  
  for (const modelName in results) {
    const modelResults = results[modelName];
    const intentCorrect = modelResults.filter(r => r.intentMatch).length;
    const depthCorrect = modelResults.filter(r => r.depthMatch).length;
    const bothCorrect = modelResults.filter(r => r.intentMatch && r.depthMatch).length;
    
    modelScores[modelName] = {
      intentAccuracy: (intentCorrect / modelResults.length * 100).toFixed(1),
      depthAccuracy: (depthCorrect / modelResults.length * 100).toFixed(1),
      overallAccuracy: (bothCorrect / modelResults.length * 100).toFixed(1)
    };
  }
  
  // Display comparison table
  console.log(`${colors.bright}Accuracy Comparison:${colors.reset}`);
  console.log(`${'─'.repeat(80)}`);
  console.log(`Model`.padEnd(25) + `Intent Acc.`.padEnd(15) + `Depth Acc.`.padEnd(15) + `Overall Acc.`);
  console.log(`${'─'.repeat(80)}`);
  
  for (const modelName in modelScores) {
    const scores = modelScores[modelName];
    const overallColor = scores.overallAccuracy >= 75 ? colors.green : 
                         scores.overallAccuracy >= 50 ? colors.yellow : colors.red;
    
    console.log(
      `${modelName.padEnd(25)}` +
      `${scores.intentAccuracy}%`.padEnd(15) +
      `${scores.depthAccuracy}%`.padEnd(15) +
      `${overallColor}${scores.overallAccuracy}%${colors.reset}`
    );
  }
  
  // Find best performing model
  const bestModel = Object.entries(modelScores).reduce((best, [name, scores]) => {
    if (!best || parseFloat(scores.overallAccuracy) > parseFloat(best[1].overallAccuracy)) {
      return [name, scores];
    }
    return best;
  }, null);
  
  console.log(`\n${colors.bright}Best Performing Model:${colors.reset}`);
  console.log(`  ${colors.green}${bestModel[0]}${colors.reset} with ${bestModel[1].overallAccuracy}% overall accuracy`);
  
  // Common failure patterns
  console.log(`\n${colors.bright}Common Failure Patterns:${colors.reset}`);
  const failurePatterns = {};
  
  for (const modelName in results) {
    results[modelName].forEach(r => {
      if (!r.intentMatch || !r.depthMatch) {
        const pattern = `${r.testCase} → ${r.response.primaryIntent || 'ERROR'}/${r.response.depth || 'ERROR'}`;
        failurePatterns[pattern] = (failurePatterns[pattern] || 0) + 1;
      }
    });
  }
  
  Object.entries(failurePatterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([pattern, count]) => {
      console.log(`  ${pattern} (${count} models)`);
    });
  
  console.log(`\n${colors.bright}Recommendations:${colors.reset}`);
  console.log(`  • Best model for intent classification: ${bestModel[0]}`);
  console.log(`  • Consider using ${bestModel[0]} for production deployment`);
  
  if (parseFloat(bestModel[1].overallAccuracy) < 75) {
    console.log(`  ${colors.yellow}⚠ Overall accuracy is below 75% - prompt engineering needed${colors.reset}`);
  }
}

// Run comparison
runModelComparison().catch(error => {
  console.error(`${colors.red}Test failed:${colors.reset}`, error);
  process.exit(1);
});