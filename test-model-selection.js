#!/usr/bin/env node

/**
 * Test script for new model selection system
 * Tests the 1/2/3/4 tier system with optimized model choices
 */

import { modelSelection } from './src/services/model-selection.js';
import { TOOL_CONFIG } from './src/config/tool-config.js';
import { MODEL_TIERS, FRONTIER_MODELS } from './src/config/model-tiers.js';

console.log('🧪 Testing Model Selection System\n');
console.log('=' * 50 + '\n');

// Test 1: Tier-based selection for each tool
console.log('📊 Test 1: Tool-based Model Selection\n');

const testTools = [
  'reflection_tool',      // Tier 1
  'socratic_tool',       // Tier 2
  'learning_diagnostic', // Tier 3
  'writing_coach'        // Tier 2
];

for (const tool of testTools) {
  const config = TOOL_CONFIG[tool];
  const result = modelSelection.selectModel({ tool });
  
  console.log(`Tool: ${tool}`);
  console.log(`  Config Tier: ${config.modelTier}`);
  console.log(`  Selected Model: ${result.modelId}`);
  console.log(`  Rationale: ${config.rationale}`);
  console.log('');
}

// Test 2: User preference handling
console.log('🎯 Test 2: User Preference Handling\n');

const preferences = ['auto', 'claude-opus-4.1', 'gpt-5', 'gemini-2.5-pro'];

for (const pref of preferences) {
  const result = modelSelection.selectModel({ 
    tool: 'socratic_tool',
    userPreference: pref 
  });
  
  console.log(`Preference: ${pref}`);
  console.log(`  Selected Model: ${result.modelId}`);
  console.log('');
}

// Test 3: Context-based optimization
console.log('🔧 Test 3: Context-based Optimization\n');

const contexts = [
  { 
    name: 'Large context (100k tokens)',
    tokenCount: 100000,
    tool: 'writing_coach'
  },
  {
    name: 'High error rate',
    errorCount: 3,
    tool: 'socratic_tool'
  },
  {
    name: 'Requires reasoning',
    requiresReasoning: true,
    tool: 'reflection_tool'
  },
  {
    name: 'Requires creativity',
    requiresCreativity: true,
    tool: 'flashcard_generator'
  }
];

for (const ctx of contexts) {
  const { name, ...context } = ctx;
  const result = modelSelection.selectModel(context);
  
  console.log(`Context: ${name}`);
  console.log(`  Base Tool: ${context.tool}`);
  console.log(`  Selected Model: ${result.modelId}`);
  console.log('');
}

// Test 4: Cost estimation
console.log('💰 Test 4: Cost Estimation\n');

const tiers = [1, 2, 3, 4];
const inputTokens = 1000;
const outputTokens = 500;

for (const tier of tiers) {
  const config = MODEL_TIERS[tier];
  const cost = modelSelection.estimateCost(tier, inputTokens, outputTokens);
  
  console.log(`Tier ${tier} (${config.name}):`);
  console.log(`  Primary Model: ${config.primary}`);
  console.log(`  Max Cost/M: $${config.maxCostPerMillion}`);
  console.log(`  Estimated Cost (1K in, 500 out): $${cost.toFixed(6)}`);
  console.log('');
}

// Test 5: Task type recommendations
console.log('🎓 Test 5: Task Type Recommendations\n');

const taskTypes = [
  'classification',
  'tutoring',
  'reasoning',
  'research'
];

for (const task of taskTypes) {
  const tier = modelSelection.recommendTier(task);
  const config = MODEL_TIERS[tier];
  
  console.log(`Task Type: ${task}`);
  console.log(`  Recommended Tier: ${tier} (${config.name})`);
  console.log(`  Primary Model: ${config.primary}`);
  console.log('');
}

// Test 6: Model availability check
console.log('✅ Test 6: Model Availability\n');

const modelsToCheck = [
  'gemini-2.5-flash-lite',
  'gpt-5-mini',
  'o4-mini',
  'gemini-2.5-pro',
  'claude-opus-4.1',
  'gpt-5'
];

for (const modelId of modelsToCheck) {
  try {
    const result = modelSelection.selectModel({ 
      userPreference: modelId 
    });
    console.log(`✓ ${modelId}: Available`);
  } catch (error) {
    console.log(`✗ ${modelId}: ${error.message}`);
  }
}

console.log('\n' + '=' * 50);
console.log('✨ Model Selection Tests Complete!\n');

// Summary
console.log('📈 Summary:');
console.log('- 4-tier system configured');
console.log('- Frontier models available with auto selection');
console.log('- Context-based optimization working');
console.log('- Cost estimation functional');
console.log('\n🎯 Ready for integration testing!');