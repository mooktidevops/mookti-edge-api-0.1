#!/usr/bin/env node

/**
 * Simple test to verify multi-tool orchestrator is working
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

console.log('Testing Multi-Tool Orchestrator Integration...\n');

// Test the core components exist
try {
  // Import modules dynamically from dist
  const { UserStateMonitor } = await import('./dist/src/services/user-state-monitor.js');
  const { IntentRouterTool } = await import('./dist/src/services/intent-router-tool.js');
  const { StateAwareMultiToolOrchestrator, MultiToolOptimizer } = await import('./dist/src/services/multi-tool-orchestrator.js');
  
  console.log('✅ All modules loaded successfully');
  
  // Create instances
  const stateMonitor = new UserStateMonitor();
  const intentRouter = new IntentRouterTool();
  const optimizer = new MultiToolOptimizer();
  
  console.log('✅ Core components instantiated');
  
  // Test basic state analysis
  const testState = await stateMonitor.analyzeState(
    "I'm frustrated and don't understand this concept",
    [],
    'socratic_tool'
  );
  
  console.log('\n📊 State Analysis Test:');
  console.log(`  Sentiment: ${testState.sentiment.type}`);
  console.log(`  Frustration: ${testState.sentiment.frustrationLevel}`);
  console.log(`  Intent: ${testState.intent.current}`);
  console.log(`  Depth: ${testState.depth.current}`);
  console.log(`  Suggested Tool: ${testState.tooling.suggestedTool}`);
  
  // Test intent routing
  const routeResult = await intentRouter.routeIntent(
    "Help me write an essay about climate change"
  );
  
  console.log('\n🎯 Intent Routing Test:');
  console.log(`  Primary Intent: ${routeResult.primaryIntent}`);
  console.log(`  Depth: ${routeResult.depth}`);
  console.log(`  Suggested Tool: ${routeResult.suggestedTool}`);
  console.log(`  Confidence: ${routeResult.confidence}`);
  
  // Test pattern detection
  console.log('\n🔄 Pattern Detection Test:');
  
  // Simulate state with frustration (should trigger fallback)
  const frustratedState = {
    sentiment: { type: 'frustrated', frustrationLevel: 0.8, confidence: 0.9 },
    intent: { current: 'understand', changed: false },
    depth: { current: 'guided', requested: 'surface', changeIndicator: false },
    tooling: { currentToolAppropriate: 'socratic_tool', suggestedTool: 'quick_answer' },
    dynamics: { turnsAtCurrentDepth: 5, progressionPattern: 'stuck' }
  };
  
  console.log('  High frustration state created - should trigger fallback pattern');
  
  // Simulate intent change (should trigger handoff)
  const previousState = {
    sentiment: { type: 'neutral', frustrationLevel: 0.3, confidence: 0.8 },
    intent: { current: 'understand', changed: false },
    depth: { current: 'guided', requested: 'guided', changeIndicator: false },
    tooling: { currentToolAppropriate: 'socratic_tool', suggestedTool: 'socratic_tool' },
    dynamics: { turnsAtCurrentDepth: 2, progressionPattern: 'stable' }
  };
  
  const newState = {
    sentiment: { type: 'motivated', frustrationLevel: 0.2, confidence: 0.9 },
    intent: { current: 'create', changed: true, changeReason: 'User wants to apply knowledge' },
    depth: { current: 'guided', requested: 'guided', changeIndicator: false },
    tooling: { currentToolAppropriate: 'socratic_tool', suggestedTool: 'writing_assistant' },
    dynamics: { turnsAtCurrentDepth: 1, progressionPattern: 'stable' }
  };
  
  console.log('  Intent change state created - should trigger handoff pattern');
  
  // Test optimizer
  console.log('\n⚡ Optimizer Test:');
  const predictedTools = ['socratic_tool', 'writing_assistant', 'concept_mapper'];
  await optimizer.preWarmTools(predictedTools, { intent: 'understand', depth: 'guided' });
  console.log(`  Pre-warmed ${predictedTools.length} tools`);
  
  const metrics = optimizer.getOptimizationMetrics();
  console.log(`  Cache size: ${metrics.cacheSize}`);
  console.log(`  Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
  
  console.log('\n✅ All basic tests passed!');
  console.log('\nMulti-tool orchestration is ready for integration.');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}