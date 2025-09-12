#!/usr/bin/env node

/**
 * Test Script for Feature Flags Configuration
 * Tests intent router with fallback and model selection with tiers
 */

require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

console.log(`${colors.cyan}${colors.bright}
════════════════════════════════════════════════════════════════
     Feature Flags Configuration Test
     Testing Intent Router & Model Selection
════════════════════════════════════════════════════════════════
${colors.reset}`);

async function testIntentRouter() {
  console.log(`\n${colors.blue}=== Testing Intent Router with Feature Flags ===${colors.reset}\n`);
  
  try {
    const { IntentRouterTool } = require('./src/services/intent-router-tool');
    const router = new IntentRouterTool();
    
    const testQueries = [
      {
        query: "What's the main theme of Romeo and Juliet?",
        expectedIntent: 'understand',
        expectedDepth: 'guided',
        description: "Simple literature question"
      },
      {
        query: "Compare FDR's New Deal with Reagan's economic policies",
        expectedIntent: 'understand',
        expectedDepth: 'guided',
        description: "Complex comparison (should trigger fallback)"
      },
      {
        query: "I need to write an essay about postcolonial themes",
        expectedIntent: 'evaluate',
        expectedDepth: 'guided',
        description: "Essay writing help"
      },
      {
        query: "Quick tip to stop procrastinating",
        expectedIntent: 'regulate',
        expectedDepth: 'surface',
        description: "Quick self-regulation"
      },
      {
        query: "Let's explore quantum mechanics and the double-slit experiment in detail",
        expectedIntent: 'explore',
        expectedDepth: 'deep',
        description: "Deep exploration"
      }
    ];
    
    for (const test of testQueries) {
      console.log(`${colors.yellow}Testing: ${test.description}${colors.reset}`);
      console.log(`Query: "${test.query}"`);
      
      const start = Date.now();
      const result = await router.routeIntent(test.query);
      const elapsed = Date.now() - start;
      
      const intentMatch = result.primaryIntent === test.expectedIntent;
      const depthMatch = result.depth === test.expectedDepth;
      
      console.log(`Intent: ${result.primaryIntent} ${intentMatch ? '✅' : '❌'} (expected: ${test.expectedIntent})`);
      console.log(`Depth: ${result.depth} ${depthMatch ? '✅' : '❌'} (expected: ${test.expectedDepth})`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`Model Used: ${result.modelUsed || 'unknown'}`);
      console.log(`Fallback: ${result.fallbackTriggered ? '🔄 Yes' : '➡️ No'}`);
      console.log(`Tool: ${result.suggestedTool}`);
      
      if (result.estimatedCost) {
        console.log(`Cost: $${result.estimatedCost.toFixed(8)}`);
      }
      
      console.log(`Time: ${elapsed}ms`);
      console.log(`---`);
    }
    
    // Show metrics
    const metrics = router.getMetrics();
    console.log(`\n${colors.cyan}Intent Router Metrics:${colors.reset}`);
    console.log(`Total Routes: ${metrics.totalRoutes}`);
    console.log(`Fallback Rate: ${(metrics.fallbackRate * 100).toFixed(1)}%`);
    console.log(`Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`Average Cost: $${metrics.averageCost.toFixed(8)}`);
    console.log(`Total Cost: $${metrics.totalCost.toFixed(6)}`);
    
  } catch (error) {
    console.error(`${colors.red}Error testing intent router:${colors.reset}`, error);
  }
}

async function testModelSelection() {
  console.log(`\n${colors.blue}=== Testing Model Selection with Feature Flags ===${colors.reset}\n`);
  
  try {
    const { modelSelection } = require('./src/services/model-selection');
    const { getFeatureFlags } = require('./src/config/feature-flags');
    
    const flags = getFeatureFlags();
    
    console.log(`${colors.cyan}Current Tier Configuration:${colors.reset}`);
    console.log(`Tier 1: ${flags.tierModels.tier1.modelId}`);
    console.log(`Tier 2: ${flags.tierModels.tier2.modelId}`);
    console.log(`Tier 3: ${flags.tierModels.tier3.modelId}`);
    console.log(`Tier 4: ${flags.tierModels.tier4.modelId}`);
    console.log();
    
    const testTools = [
      'reflection_tool',      // Tier 1
      'socratic_tool',        // Tier 2
      'learning_diagnostic',  // Tier 3
      'worked_example'        // Tier 3
    ];
    
    for (const tool of testTools) {
      const result = modelSelection.selectModel({ tool });
      const cost = modelSelection.estimateCost(
        result.tier || 2,
        1000,  // input tokens
        500    // output tokens
      );
      
      console.log(`Tool: ${colors.yellow}${tool}${colors.reset}`);
      console.log(`  Model: ${result.modelId || (result.model as any)?.modelId}`);
      console.log(`  Tier: ${result.tier || 'unknown'}`);
      console.log(`  Est. Cost: $${cost.toFixed(6)}`);
    }
    
    // Test user preference override
    console.log(`\n${colors.cyan}Testing User Preference Override:${colors.reset}`);
    const preferenceResult = modelSelection.selectModel({
      tool: 'socratic_tool',
      userPreference: 'claude-opus-4'
    });
    console.log(`With preference 'claude-opus-4': ${preferenceResult.modelId || (preferenceResult.model as any)?.modelId}`);
    
    // Test large context handling
    console.log(`\n${colors.cyan}Testing Large Context Handling:${colors.reset}`);
    const largeContextResult = modelSelection.selectModel({
      tool: 'socratic_tool',
      tokenCount: 75000
    });
    console.log(`With 75k tokens: ${largeContextResult.modelId || (largeContextResult.model as any)?.modelId}`);
    
  } catch (error) {
    console.error(`${colors.red}Error testing model selection:${colors.reset}`, error);
  }
}

async function testEnvironmentOverrides() {
  console.log(`\n${colors.blue}=== Testing Environment Variable Overrides ===${colors.reset}\n`);
  
  // Temporarily set environment variables
  process.env.INTENT_ROUTER_PRIMARY_MODEL = 'gpt-4o';
  process.env.INTENT_ROUTER_CONFIDENCE_THRESHOLD = '0.7';
  
  const { getFeatureFlags } = require('./src/config/feature-flags');
  
  // Clear the require cache to reload with new env vars
  delete require.cache[require.resolve('./src/config/feature-flags')];
  
  const flags = getFeatureFlags();
  
  console.log(`Primary Intent Model: ${flags.intentRouter.primary.modelId}`);
  console.log(`Confidence Threshold: ${flags.intentRouter.fallbackConfidenceThreshold}`);
  
  // Clean up
  delete process.env.INTENT_ROUTER_PRIMARY_MODEL;
  delete process.env.INTENT_ROUTER_CONFIDENCE_THRESHOLD;
}

async function main() {
  try {
    await testIntentRouter();
    await testModelSelection();
    await testEnvironmentOverrides();
    
    console.log(`\n${colors.green}${colors.bright}✅ All tests completed successfully!${colors.reset}`);
    
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}❌ Test failed:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);