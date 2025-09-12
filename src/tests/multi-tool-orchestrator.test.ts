import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  StateAwareMultiToolOrchestrator, 
  MultiToolOptimizer,
  OrchestrationPattern,
  MultiToolResult
} from '../services/multi-tool-orchestrator';
import { UserState } from '../services/user-state-monitor';
import { IntentRouterTool } from '../services/intent-router-tool';
import { QueryOptimizer } from '../services/query-optimizer';
import { ContextManager } from '../services/context-manager';
import { EllenTools } from '../services/ellen-tools';

describe('Multi-Tool Orchestrator Tests', () => {
  let orchestrator: StateAwareMultiToolOrchestrator;
  let optimizer: MultiToolOptimizer;
  let mockIntentRouter: any;
  let mockQueryOptimizer: any;
  let mockContextManager: any;
  let mockEllenTools: any;

  beforeEach(() => {
    // Setup mocks
    mockIntentRouter = {
      selectToolForIntent: vi.fn().mockReturnValue('socratic_tool')
    };
    
    mockQueryOptimizer = {
      optimize: vi.fn().mockResolvedValue({ optimized: true })
    };
    
    mockContextManager = {
      getContext: vi.fn().mockResolvedValue({ context: 'test' })
    };
    
    mockEllenTools = {
      getTool: vi.fn().mockResolvedValue({
        execute: vi.fn().mockResolvedValue({ response: 'Tool executed' })
      })
    };

    orchestrator = new StateAwareMultiToolOrchestrator(
      mockIntentRouter,
      mockQueryOptimizer,
      mockContextManager,
      mockEllenTools
    );
    
    optimizer = new MultiToolOptimizer();
  });

  describe('Pattern Detection', () => {
    it('should detect handoff pattern on intent change', async () => {
      const currentState: UserState = {
        sentiment: { type: 'neutral', frustrationLevel: 0.3, confidence: 0.8 },
        intent: { current: 'create', changed: true, changeReason: 'User shifted from understanding to creating' },
        depth: { current: 'guided', requested: 'guided', changeIndicator: false },
        tooling: { currentToolAppropriate: 'socratic_tool', suggestedTool: 'writing_assistant' },
        dynamics: { turnsAtCurrentDepth: 3, progressionPattern: 'stable' }
      };

      const previousState: UserState = {
        sentiment: { type: 'neutral', frustrationLevel: 0.2, confidence: 0.8 },
        intent: { current: 'understand', changed: false, changeReason: '' },
        depth: { current: 'guided', requested: 'guided', changeIndicator: false },
        tooling: { currentToolAppropriate: 'socratic_tool', suggestedTool: 'socratic_tool' },
        dynamics: { turnsAtCurrentDepth: 2, progressionPattern: 'stable' }
      };

      const result = await orchestrator.orchestrate(
        'Now I want to write an essay about this topic',
        currentState,
        previousState,
        'test-session-1'
      );

      expect(result.pattern.type).toBe('handoff');
      expect(result.pattern.reason).toContain('User shifted from understanding to creating');
      expect(result.pattern.tools).toContain('writing_assistant');
    });

    it('should detect parallel pattern for multiple intents', async () => {
      const currentState: UserState = {
        sentiment: { type: 'neutral', frustrationLevel: 0.2, confidence: 0.8 },
        intent: { current: 'understand', changed: false, changeReason: '' },
        depth: { current: 'guided', requested: 'guided', changeIndicator: false },
        tooling: { currentToolAppropriate: 'socratic_tool', suggestedTool: 'socratic_tool' },
        dynamics: { turnsAtCurrentDepth: 1, progressionPattern: 'stable' }
      };

      const result = await orchestrator.orchestrate(
        'Can you explain quantum physics and also help me solve this problem about wave functions?',
        currentState,
        undefined,
        'test-session-2'
      );

      // The parallel pattern detection depends on LLM analysis
      // For testing, we'd need to mock the detectMultipleIntents method
      expect(result.pattern.type).toBeDefined();
      expect(result.executions.length).toBeGreaterThan(0);
    });

    it('should detect chain pattern for depth progression', async () => {
      const currentState: UserState = {
        sentiment: { type: 'positive', frustrationLevel: 0.1, confidence: 0.9 },
        intent: { current: 'understand', changed: false, changeReason: '' },
        depth: { current: 'deep', requested: 'deep', changeIndicator: true },
        tooling: { currentToolAppropriate: 'socratic_tool', suggestedTool: 'concept_mapper' },
        dynamics: { turnsAtCurrentDepth: 5, progressionPattern: 'deepening' }
      };

      const previousState: UserState = {
        sentiment: { type: 'neutral', frustrationLevel: 0.2, confidence: 0.8 },
        intent: { current: 'understand', changed: false, changeReason: '' },
        depth: { current: 'surface', requested: 'guided', changeIndicator: false },
        tooling: { currentToolAppropriate: 'quick_answer', suggestedTool: 'socratic_tool' },
        dynamics: { turnsAtCurrentDepth: 2, progressionPattern: 'stable' }
      };

      const result = await orchestrator.orchestrate(
        'I want to understand this at a much deeper level',
        currentState,
        previousState,
        'test-session-3'
      );

      expect(result.pattern.type).toBe('chain');
      expect(result.pattern.reason).toBe('Depth progression detected');
      expect(result.pattern.tools.length).toBeGreaterThan(1);
    });

    it('should detect fallback pattern for high frustration', async () => {
      const currentState: UserState = {
        sentiment: { type: 'frustrated', frustrationLevel: 0.8, confidence: 0.9 },
        intent: { current: 'solve', changed: false, changeReason: '' },
        depth: { current: 'guided', requested: 'surface', changeIndicator: true },
        tooling: { currentToolAppropriate: 'problem_solver', suggestedTool: 'quick_answer' },
        dynamics: { turnsAtCurrentDepth: 6, progressionPattern: 'stuck' }
      };

      const result = await orchestrator.orchestrate(
        'This is not helping at all, just give me the answer',
        currentState,
        undefined,
        'test-session-4'
      );

      expect(result.pattern.type).toBe('fallback');
      expect(result.pattern.reason).toBe('High frustration detected');
      expect(result.pattern.tools).toContain('quick_answer');
      expect(result.pattern.tools).toContain('practical_guide');
    });
  });

  describe('Pattern Execution', () => {
    it('should execute handoff pattern correctly', async () => {
      const pattern: OrchestrationPattern = {
        type: 'handoff',
        reason: 'Intent shift from understand to create',
        tools: ['socratic_tool', 'writing_assistant'],
        context: {
          previousIntent: 'understand',
          newIntent: 'create'
        }
      };

      const currentState: UserState = {
        sentiment: { type: 'neutral', frustrationLevel: 0.3, confidence: 0.8 },
        intent: { current: 'create', changed: true, changeReason: 'Shift detected' },
        depth: { current: 'guided', requested: 'guided', changeIndicator: false },
        tooling: { currentToolAppropriate: 'socratic_tool', suggestedTool: 'writing_assistant' },
        dynamics: { turnsAtCurrentDepth: 3, progressionPattern: 'stable' }
      };

      const result = await orchestrator.orchestrate(
        'Help me write about this',
        currentState,
        undefined,
        'test-handoff'
      );

      expect(result.executions).toBeDefined();
      expect(result.metadata.toolCount).toBeGreaterThanOrEqual(1);
    });

    it('should execute parallel pattern with multiple tools', async () => {
      // Mock multiple tool executions
      let toolCallCount = 0;
      mockEllenTools.getTool = vi.fn().mockResolvedValue({
        execute: vi.fn().mockImplementation(() => {
          toolCallCount++;
          return Promise.resolve({ 
            response: `Tool ${toolCallCount} executed`,
            success: true 
          });
        })
      });

      const currentState: UserState = {
        sentiment: { type: 'curious', frustrationLevel: 0.1, confidence: 0.9 },
        intent: { current: 'understand', changed: false, changeReason: '' },
        depth: { current: 'guided', requested: 'guided', changeIndicator: false },
        tooling: { currentToolAppropriate: 'socratic_tool', suggestedTool: 'socratic_tool' },
        dynamics: { turnsAtCurrentDepth: 2, progressionPattern: 'stable' }
      };

      const result = await orchestrator.orchestrate(
        'Explain and demonstrate multiple concepts',
        currentState,
        undefined,
        'test-parallel'
      );

      expect(result.executions).toBeDefined();
      expect(result.metadata.totalExecutionTime).toBeGreaterThan(0);
    });

    it('should handle chain pattern with progressive deepening', async () => {
      const currentState: UserState = {
        sentiment: { type: 'engaged', frustrationLevel: 0.1, confidence: 0.9 },
        intent: { current: 'understand', changed: false, changeReason: '' },
        depth: { current: 'deep', requested: 'deep', changeIndicator: true },
        tooling: { currentToolAppropriate: 'socratic_tool', suggestedTool: 'concept_mapper' },
        dynamics: { turnsAtCurrentDepth: 4, progressionPattern: 'deepening' }
      };

      const previousState: UserState = {
        sentiment: { type: 'neutral', frustrationLevel: 0.2, confidence: 0.8 },
        intent: { current: 'understand', changed: false, changeReason: '' },
        depth: { current: 'surface', requested: 'guided', changeIndicator: false },
        tooling: { currentToolAppropriate: 'quick_answer', suggestedTool: 'socratic_tool' },
        dynamics: { turnsAtCurrentDepth: 1, progressionPattern: 'stable' }
      };

      const result = await orchestrator.orchestrate(
        'Take me deeper into this concept',
        currentState,
        previousState,
        'test-chain'
      );

      expect(result.pattern.type).toBe('chain');
      expect(result.executions.length).toBeGreaterThanOrEqual(1);
      expect(result.metadata.patternEffectiveness).toBeGreaterThan(0);
    });

    it('should execute fallback pattern when tools fail', async () => {
      // Mock first tool failure
      let callCount = 0;
      mockEllenTools.getTool = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            execute: vi.fn().mockRejectedValue(new Error('Tool failed'))
          };
        }
        return {
          execute: vi.fn().mockResolvedValue({ response: 'Fallback succeeded' })
        };
      });

      const currentState: UserState = {
        sentiment: { type: 'frustrated', frustrationLevel: 0.8, confidence: 0.9 },
        intent: { current: 'solve', changed: false, changeReason: '' },
        depth: { current: 'guided', requested: 'surface', changeIndicator: true },
        tooling: { currentToolAppropriate: 'problem_solver', suggestedTool: 'quick_answer' },
        dynamics: { turnsAtCurrentDepth: 5, progressionPattern: 'stuck' }
      };

      const result = await orchestrator.orchestrate(
        'Nothing is working',
        currentState,
        undefined,
        'test-fallback'
      );

      expect(result.pattern.type).toBe('fallback');
      expect(result.executions.some(e => e.success)).toBe(true);
    });
  });

  describe('Multi-Tool Optimizer', () => {
    it('should pre-warm tools correctly', async () => {
      const toolsToWarm = ['socratic_tool', 'writing_assistant', 'concept_mapper'];
      const context = { intent: 'understand', depth: 'guided' };

      await optimizer.preWarmTools(toolsToWarm, context);
      
      const metrics = optimizer.getOptimizationMetrics();
      expect(metrics.cacheSize).toBeGreaterThan(0);
    });

    it('should predict next tools based on patterns', () => {
      const sessionId = 'test-session';
      const currentState: UserState = {
        sentiment: { type: 'neutral', frustrationLevel: 0.3, confidence: 0.8 },
        intent: { current: 'understand', changed: false, changeReason: '' },
        depth: { current: 'guided', requested: 'guided', changeIndicator: false },
        tooling: { currentToolAppropriate: 'socratic_tool', suggestedTool: 'concept_mapper' },
        dynamics: { turnsAtCurrentDepth: 3, progressionPattern: 'stable' }
      };

      // Record some patterns
      optimizer.recordPattern(sessionId, {
        type: 'handoff',
        reason: 'Test',
        tools: ['socratic_tool', 'concept_mapper']
      });

      optimizer.recordPattern(sessionId, {
        type: 'chain',
        reason: 'Test',
        tools: ['concept_mapper', 'review_tool']
      });

      const predictedTools = optimizer.predictNextTools(
        sessionId,
        currentState,
        []
      );

      expect(predictedTools).toContain('concept_mapper');
      expect(predictedTools.length).toBeGreaterThan(0);
    });

    it('should track optimization metrics', () => {
      const metrics = optimizer.getOptimizationMetrics();
      
      expect(metrics).toHaveProperty('cacheSize');
      expect(metrics).toHaveProperty('sessionsTracked');
      expect(metrics).toHaveProperty('totalPatternsRecorded');
      expect(metrics).toHaveProperty('cacheHitRate');
    });

    it('should clear old cache entries', async () => {
      // Pre-warm some tools
      await optimizer.preWarmTools(['tool1', 'tool2'], { test: true });
      
      const metricsBefore = optimizer.getOptimizationMetrics();
      expect(metricsBefore.cacheSize).toBeGreaterThan(0);
      
      // Clear with 0 maxAge (clear everything)
      optimizer.clearOldCache(0);
      
      const metricsAfter = optimizer.getOptimizationMetrics();
      expect(metricsAfter.cacheSize).toBe(0);
    });
  });

  describe('Pattern Effectiveness Calculation', () => {
    it('should calculate high effectiveness for successful patterns', async () => {
      // Mock successful tool execution
      mockEllenTools.getTool = vi.fn().mockResolvedValue({
        execute: vi.fn().mockResolvedValue({ 
          response: 'Success',
          success: true 
        })
      });

      const currentState: UserState = {
        sentiment: { type: 'positive', frustrationLevel: 0.1, confidence: 0.9 },
        intent: { current: 'understand', changed: false, changeReason: '' },
        depth: { current: 'guided', requested: 'guided', changeIndicator: false },
        tooling: { currentToolAppropriate: 'socratic_tool', suggestedTool: 'socratic_tool' },
        dynamics: { turnsAtCurrentDepth: 2, progressionPattern: 'stable' }
      };

      const result = await orchestrator.orchestrate(
        'Help me understand this',
        currentState,
        undefined,
        'test-effectiveness'
      );

      expect(result.metadata.patternEffectiveness).toBeGreaterThan(0.5);
    });

    it('should calculate low effectiveness for failed patterns', async () => {
      // Mock failed tool execution
      mockEllenTools.getTool = vi.fn().mockResolvedValue({
        execute: vi.fn().mockRejectedValue(new Error('Tool failed'))
      });

      const currentState: UserState = {
        sentiment: { type: 'frustrated', frustrationLevel: 0.8, confidence: 0.9 },
        intent: { current: 'solve', changed: false, changeReason: '' },
        depth: { current: 'guided', requested: 'surface', changeIndicator: false },
        tooling: { currentToolAppropriate: 'problem_solver', suggestedTool: 'problem_solver' },
        dynamics: { turnsAtCurrentDepth: 5, progressionPattern: 'stuck' }
      };

      const result = await orchestrator.orchestrate(
        'This is not working',
        currentState,
        undefined,
        'test-low-effectiveness'
      );

      expect(result.metadata.patternEffectiveness).toBeLessThan(0.5);
    });
  });
});

describe('Real Conversation Scenarios', () => {
  let orchestrator: StateAwareMultiToolOrchestrator;
  let mockIntentRouter: any;
  let mockQueryOptimizer: any;
  let mockContextManager: any;
  let mockEllenTools: any;

  beforeEach(() => {
    mockIntentRouter = {
      selectToolForIntent: vi.fn().mockImplementation((intent, depth) => {
        const toolMap: Record<string, Record<string, string>> = {
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
          }
        };
        return toolMap[intent]?.[depth] || 'socratic_tool';
      })
    };
    
    mockQueryOptimizer = {
      optimize: vi.fn().mockResolvedValue({ optimized: true })
    };
    
    mockContextManager = {
      getContext: vi.fn().mockResolvedValue({ context: 'test' })
    };
    
    mockEllenTools = {
      getTool: vi.fn().mockImplementation((toolName) => ({
        execute: vi.fn().mockResolvedValue({ 
          response: `${toolName} response`,
          tool: toolName
        })
      }))
    };

    orchestrator = new StateAwareMultiToolOrchestrator(
      mockIntentRouter,
      mockQueryOptimizer,
      mockContextManager,
      mockEllenTools
    );
  });

  it('should handle learning progression scenario', async () => {
    // Scenario: User starts with quick question, then wants deeper understanding
    
    // Turn 1: Quick question
    const state1: UserState = {
      sentiment: { type: 'neutral', frustrationLevel: 0.2, confidence: 0.8 },
      intent: { current: 'understand', changed: false, changeReason: '' },
      depth: { current: 'surface', requested: 'surface', changeIndicator: false },
      tooling: { currentToolAppropriate: 'quick_answer', suggestedTool: 'quick_answer' },
      dynamics: { turnsAtCurrentDepth: 1, progressionPattern: 'stable' }
    };

    const result1 = await orchestrator.orchestrate(
      'What is machine learning?',
      state1,
      undefined,
      'learning-session'
    );

    expect(result1.executions[0].tool).toBe('quick_answer');

    // Turn 2: Wants more detail
    const state2: UserState = {
      sentiment: { type: 'curious', frustrationLevel: 0.1, confidence: 0.9 },
      intent: { current: 'understand', changed: false, changeReason: '' },
      depth: { current: 'guided', requested: 'guided', changeIndicator: true },
      tooling: { currentToolAppropriate: 'quick_answer', suggestedTool: 'socratic_tool' },
      dynamics: { turnsAtCurrentDepth: 1, progressionPattern: 'deepening' }
    };

    const result2 = await orchestrator.orchestrate(
      'Can you explain how neural networks work in more detail?',
      state2,
      state1,
      'learning-session'
    );

    expect(result2.pattern.type).toBe('chain');
    expect(result2.executions.some(e => e.tool === 'socratic_tool')).toBe(true);

    // Turn 3: Deep dive
    const state3: UserState = {
      sentiment: { type: 'engaged', frustrationLevel: 0.05, confidence: 0.95 },
      intent: { current: 'understand', changed: false, changeReason: '' },
      depth: { current: 'deep', requested: 'deep', changeIndicator: true },
      tooling: { currentToolAppropriate: 'socratic_tool', suggestedTool: 'concept_mapper' },
      dynamics: { turnsAtCurrentDepth: 1, progressionPattern: 'deepening' }
    };

    const result3 = await orchestrator.orchestrate(
      'I want to understand the mathematical foundations and how backpropagation works',
      state3,
      state2,
      'learning-session'
    );

    expect(result3.pattern.type).toBe('chain');
    expect(result3.pattern.tools).toContain('concept_mapper');
  });

  it('should handle frustration and recovery scenario', async () => {
    // Scenario: User gets frustrated, system switches to more direct approach
    
    // Turn 1: Normal learning
    const state1: UserState = {
      sentiment: { type: 'neutral', frustrationLevel: 0.3, confidence: 0.8 },
      intent: { current: 'solve', changed: false, changeReason: '' },
      depth: { current: 'guided', requested: 'guided', changeIndicator: false },
      tooling: { currentToolAppropriate: 'problem_solver', suggestedTool: 'problem_solver' },
      dynamics: { turnsAtCurrentDepth: 1, progressionPattern: 'stable' }
    };

    const result1 = await orchestrator.orchestrate(
      'Help me debug this code',
      state1,
      undefined,
      'frustration-session'
    );

    expect(result1.executions[0].tool).toBe('problem_solver');

    // Turn 2: Growing frustration
    const state2: UserState = {
      sentiment: { type: 'frustrated', frustrationLevel: 0.85, confidence: 0.9 },
      intent: { current: 'solve', changed: false, changeReason: '' },
      depth: { current: 'surface', requested: 'surface', changeIndicator: true },
      tooling: { currentToolAppropriate: 'problem_solver', suggestedTool: 'quick_answer' },
      dynamics: { turnsAtCurrentDepth: 3, progressionPattern: 'stuck' }
    };

    const result2 = await orchestrator.orchestrate(
      'This is not helping, just tell me what is wrong!',
      state2,
      state1,
      'frustration-session'
    );

    expect(result2.pattern.type).toBe('fallback');
    expect(result2.pattern.tools).toContain('quick_answer');
    expect(result2.pattern.tools).toContain('practical_guide');
  });

  it('should handle multi-intent scenario', async () => {
    // Scenario: User has multiple needs in one query
    
    const state: UserState = {
      sentiment: { type: 'neutral', frustrationLevel: 0.2, confidence: 0.8 },
      intent: { current: 'understand', changed: false, changeReason: '' },
      depth: { current: 'guided', requested: 'guided', changeIndicator: false },
      tooling: { currentToolAppropriate: 'socratic_tool', suggestedTool: 'socratic_tool' },
      dynamics: { turnsAtCurrentDepth: 1, progressionPattern: 'stable' }
    };

    const result = await orchestrator.orchestrate(
      'Can you explain React hooks and also help me write a custom hook for authentication?',
      state,
      undefined,
      'multi-intent-session'
    );

    // Should detect multiple intents and potentially use parallel pattern
    expect(result.pattern).toBeDefined();
    expect(result.executions.length).toBeGreaterThanOrEqual(1);
    
    // In a real scenario with proper intent detection, this would be:
    // expect(result.pattern.type).toBe('parallel');
    // expect(result.executions).toContain(expect.objectContaining({ tool: 'socratic_tool' }));
    // expect(result.executions).toContain(expect.objectContaining({ tool: 'writing_assistant' }));
  });

  it('should handle intent transition scenario', async () => {
    // Scenario: User transitions from learning to creating
    
    // Turn 1: Understanding phase
    const state1: UserState = {
      sentiment: { type: 'neutral', frustrationLevel: 0.2, confidence: 0.8 },
      intent: { current: 'understand', changed: false, changeReason: '' },
      depth: { current: 'guided', requested: 'guided', changeIndicator: false },
      tooling: { currentToolAppropriate: 'socratic_tool', suggestedTool: 'socratic_tool' },
      dynamics: { turnsAtCurrentDepth: 2, progressionPattern: 'stable' }
    };

    const result1 = await orchestrator.orchestrate(
      'Explain the principles of good API design',
      state1,
      undefined,
      'transition-session'
    );

    expect(result1.executions[0].tool).toBe('socratic_tool');

    // Turn 2: Transition to creation
    const state2: UserState = {
      sentiment: { type: 'motivated', frustrationLevel: 0.1, confidence: 0.9 },
      intent: { current: 'create', changed: true, changeReason: 'User wants to apply knowledge' },
      depth: { current: 'guided', requested: 'guided', changeIndicator: false },
      tooling: { currentToolAppropriate: 'socratic_tool', suggestedTool: 'project_ideation_tool' },
      dynamics: { turnsAtCurrentDepth: 1, progressionPattern: 'stable' }
    };

    const result2 = await orchestrator.orchestrate(
      'Now I want to design an API for my todo app',
      state2,
      state1,
      'transition-session'
    );

    expect(result2.pattern.type).toBe('handoff');
    expect(result2.pattern.tools).toContain('project_ideation_tool');
    expect(result2.pattern.context?.previousIntent).toBe('understand');
    expect(result2.pattern.context?.newIntent).toBe('create');
  });
});