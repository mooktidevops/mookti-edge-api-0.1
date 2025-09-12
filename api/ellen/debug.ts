import type { NextApiRequest, NextApiResponse } from 'next';
import { EllenOrchestrator } from '../../src/services/ellen-orchestrator';
import { UserStateMonitor } from '../../src/services/user-state-monitor';
import { IntentRouterTool } from '../../src/services/intent-router-tool';
import { StateAwareMultiToolOrchestrator, MultiToolOptimizer } from '../../src/services/multi-tool-orchestrator';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      message, 
      sessionId, 
      conversationHistory = [],
      debugMode = true,
      testPattern = null // For testing specific patterns
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Create orchestrator instance
    const orchestrator = new EllenOrchestrator();
    
    // Create state monitor for detailed analysis
    const stateMonitor = new UserStateMonitor();
    
    // Analyze user state
    const userState = await stateMonitor.analyzeState(
      message,
      conversationHistory,
      'socratic_tool' // Default tool
    );
    
    // Get intent routing analysis
    const intentRouter = new IntentRouterTool();
    const intentRoute = await intentRouter.routeIntent(message, {
      conversationHistory,
      sessionId
    });
    
    // Prepare debug response
    const debugInfo = {
      userState: {
        sentiment: {
          type: userState.sentiment.type,
          frustrationLevel: userState.sentiment.frustrationLevel,
          confidence: userState.sentiment.confidence
        },
        intent: {
          current: userState.intent.current,
          changed: userState.intent.changed,
          changeReason: userState.intent.changeReason
        },
        depth: {
          current: userState.depth.current,
          requested: userState.depth.requested,
          changeIndicator: userState.depth.changeIndicator
        },
        tooling: {
          currentToolAppropriate: userState.tooling.currentToolAppropriate,
          suggestedTool: userState.tooling.suggestedTool
        },
        dynamics: {
          turnsAtCurrentDepth: userState.dynamics.turnsAtCurrentDepth,
          progressionPattern: userState.dynamics.progressionPattern
        }
      },
      intentRouting: {
        primaryIntent: intentRoute.primaryIntent,
        secondaryIntents: intentRoute.secondaryIntents,
        depth: intentRoute.depth,
        suggestedTool: intentRoute.suggestedTool,
        confidence: intentRoute.confidence,
        reasoning: intentRoute.reasoning
      },
      orchestrationPattern: null,
      multiToolExecution: null,
      performanceMetrics: null
    };
    
    // If we have a previous state (from session), determine orchestration pattern
    if (sessionId && conversationHistory.length > 0) {
      // Simulate previous state (in production, this would come from session storage)
      const previousState = {
        sentiment: { type: 'neutral', frustrationLevel: 0.3, confidence: 0.8 },
        intent: { current: 'understand', changed: false },
        depth: { current: 'guided', requested: 'guided', changeIndicator: false },
        tooling: { currentToolAppropriate: 'socratic_tool', suggestedTool: 'socratic_tool' },
        dynamics: { turnsAtCurrentDepth: 2, progressionPattern: 'stable' }
      };
      
      // Determine orchestration pattern
      let pattern = 'single'; // Default
      
      if (userState.sentiment.frustrationLevel >= 0.7) {
        pattern = 'fallback';
      } else if (userState.intent.changed) {
        pattern = 'handoff';
      } else if (userState.depth.changeIndicator) {
        pattern = 'chain';
      } else if (intentRoute.secondaryIntents && intentRoute.secondaryIntents.length > 0) {
        pattern = 'parallel';
      }
      
      debugInfo.orchestrationPattern = {
        type: pattern,
        reason: getPatternReason(pattern, userState),
        triggeredBy: getPatternTrigger(pattern, userState)
      };
    }
    
    // Test specific pattern if requested
    if (testPattern) {
      debugInfo.testMode = true;
      debugInfo.testedPattern = testPattern;
      
      // Create mock orchestrator for testing
      const mockEllenTools = {
        getTool: async (toolName: string) => ({
          execute: async () => ({
            response: `Mock response from ${toolName}`,
            success: true
          })
        })
      };
      
      const testOrchestrator = new StateAwareMultiToolOrchestrator(
        intentRouter,
        new (await import('../../src/services/query-optimizer')).QueryOptimizer(),
        new (await import('../../src/services/context-manager')).ContextManager(),
        mockEllenTools
      );
      
      // Execute test pattern
      const result = await testOrchestrator.orchestrate(
        message,
        userState,
        undefined,
        sessionId || 'test-session'
      );
      
      debugInfo.multiToolExecution = {
        pattern: result.pattern,
        executionCount: result.executions.length,
        tools: result.executions.map((e: any) => e.tool),
        totalTime: result.metadata.totalExecutionTime,
        effectiveness: result.metadata.patternEffectiveness
      };
    }
    
    // Get optimizer metrics
    const optimizer = new MultiToolOptimizer();
    const optimizerMetrics = optimizer.getOptimizationMetrics();
    
    debugInfo.performanceMetrics = {
      cacheSize: optimizerMetrics.cacheSize,
      sessionsTracked: optimizerMetrics.sessionsTracked,
      patternsRecorded: optimizerMetrics.totalPatternsRecorded,
      cacheHitRate: optimizerMetrics.cacheHitRate
    };
    
    // Matrix coverage analysis
    const matrixCoverage = analyzeMatrixCoverage();
    debugInfo.matrixCoverage = matrixCoverage;
    
    // Return debug information
    res.status(200).json({
      success: true,
      message: 'Debug analysis complete',
      input: {
        message,
        sessionId,
        historyLength: conversationHistory.length
      },
      debug: debugInfo,
      recommendations: getRecommendations(userState, intentRoute),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Ellen debug error:', error);
    res.status(500).json({
      error: 'Debug analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function getPatternReason(pattern: string, userState: any): string {
  const reasons: Record<string, string> = {
    fallback: `High frustration detected (${(userState.sentiment.frustrationLevel * 10).toFixed(1)}/10)`,
    handoff: `Intent changed from previous turn to ${userState.intent.current}`,
    chain: `Depth progression to ${userState.depth.current} level`,
    parallel: 'Multiple intents detected in query',
    single: 'Standard single-tool execution'
  };
  return reasons[pattern] || 'Unknown pattern';
}

function getPatternTrigger(pattern: string, userState: any): string {
  const triggers: Record<string, string> = {
    fallback: 'sentiment.frustrationLevel >= 0.7',
    handoff: 'intent.changed === true',
    chain: 'depth.changeIndicator === true',
    parallel: 'multipleIntents.detected',
    single: 'default'
  };
  return triggers[pattern] || 'unknown';
}

function getRecommendations(userState: any, intentRoute: any): string[] {
  const recommendations = [];
  
  if (userState.sentiment.frustrationLevel > 0.5) {
    recommendations.push('Consider switching to a more direct tool like quick_answer');
  }
  
  if (userState.dynamics.progressionPattern === 'stuck') {
    recommendations.push('User appears stuck - offer alternative approaches');
  }
  
  if (userState.depth.requested && userState.depth.requested !== userState.depth.current) {
    recommendations.push(`Adjust depth from ${userState.depth.current} to ${userState.depth.requested}`);
  }
  
  if (intentRoute.confidence < 0.5) {
    recommendations.push('Low confidence in intent detection - consider clarifying');
  }
  
  if (userState.tooling.suggestedTool !== userState.tooling.currentToolAppropriate) {
    recommendations.push(`Consider switching from ${userState.tooling.currentToolAppropriate} to ${userState.tooling.suggestedTool}`);
  }
  
  return recommendations;
}

function analyzeMatrixCoverage(): any {
  const intents = ['understand', 'create', 'solve', 'evaluate', 'organize', 'regulate', 'explore', 'interact'];
  const depths = ['surface', 'guided', 'deep'];
  
  const coverage: any = {
    total: 24,
    covered: 0,
    missing: [],
    partial: []
  };
  
  const toolMap: Record<string, boolean> = {
    'quick_answer': true,
    'socratic_tool': true,
    'concept_mapper': true,
    'writing_assistant': true,
    'project_ideation_tool': true,
    'creative_exploration_tool': false,
    'problem_solver': true,
    'breakthrough_tool': false,
    'evaluator_tool': true,
    'review_tool': true,
    'critical_analysis_tool': false,
    'plan_manager': true,
    'focus_session': true,
    'emotional_regulation_tool': false,
    'genealogy_tool': true,
    'peer_connector': false,
    'debate_moderator': false
  };
  
  for (const intent of intents) {
    for (const depth of depths) {
      const cell = `${intent}/${depth}`;
      const tool = getToolForCell(intent, depth);
      
      if (toolMap[tool] === true) {
        coverage.covered++;
      } else if (toolMap[tool] === false) {
        coverage.missing.push({ cell, tool });
      } else {
        coverage.partial.push({ cell, fallback: 'socratic_tool' });
      }
    }
  }
  
  coverage.percentage = ((coverage.covered / coverage.total) * 100).toFixed(1);
  return coverage;
}

function getToolForCell(intent: string, depth: string): string {
  const matrix: Record<string, Record<string, string>> = {
    'understand': {
      'surface': 'quick_answer',
      'guided': 'socratic_tool',
      'deep': 'concept_mapper'
    },
    'create': {
      'surface': 'writing_assistant',
      'guided': 'project_ideation_tool',
      'deep': 'creative_exploration_tool'
    },
    'solve': {
      'surface': 'problem_solver',
      'guided': 'socratic_tool',
      'deep': 'breakthrough_tool'
    },
    'evaluate': {
      'surface': 'evaluator_tool',
      'guided': 'review_tool',
      'deep': 'critical_analysis_tool'
    },
    'organize': {
      'surface': 'plan_manager',
      'guided': 'plan_manager',
      'deep': 'plan_manager'
    },
    'regulate': {
      'surface': 'focus_session',
      'guided': 'emotional_regulation_tool',
      'deep': 'breakthrough_tool'
    },
    'explore': {
      'surface': 'genealogy_tool',
      'guided': 'socratic_tool',
      'deep': 'creative_exploration_tool'
    },
    'interact': {
      'surface': 'peer_connector',
      'guided': 'socratic_tool',
      'deep': 'debate_moderator'
    }
  };
  
  return matrix[intent]?.[depth] || 'socratic_tool';
}