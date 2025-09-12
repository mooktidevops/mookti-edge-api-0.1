import { UserState } from './user-state-monitor';
import { IntentRouterTool } from './intent-router-tool';
import { ellenTools } from './ellen-tools';
import { QueryOptimizer } from './query-optimizer';
import { ContextManager } from './context-manager';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export interface Tool {
  name: string;
  execute: (input: any) => Promise<any>;
}

export interface ToolExecutionResult {
  tool: string;
  result: any;
  success: boolean;
  error?: string;
  executionTime: number;
  context?: Record<string, any>;
}

export interface OrchestrationPattern {
  type: 'handoff' | 'parallel' | 'chain' | 'fallback';
  reason: string;
  tools: string[];
  context?: Record<string, any>;
}

export interface MultiToolResult {
  pattern: OrchestrationPattern;
  executions: ToolExecutionResult[];
  finalResponse?: string;
  metadata: {
    totalExecutionTime: number;
    toolCount: number;
    patternEffectiveness: number;
  };
}

export class StateAwareMultiToolOrchestrator {
  private intentRouter: IntentRouterTool;
  private queryOptimizer: QueryOptimizer;
  private contextManager: ContextManager;
  private ellenTools: any;
  private executionHistory: Map<string, ToolExecutionResult[]> = new Map();

  constructor(
    intentRouter: IntentRouterTool,
    queryOptimizer: QueryOptimizer,
    contextManager: ContextManager,
    ellenTools: any
  ) {
    this.intentRouter = intentRouter;
    this.queryOptimizer = queryOptimizer;
    this.contextManager = contextManager;
    this.ellenTools = ellenTools;
  }

  async orchestrate(
    query: string,
    userState: UserState,
    previousState?: UserState,
    sessionId?: string
  ): Promise<MultiToolResult> {
    const startTime = Date.now();
    
    // Determine orchestration pattern based on state changes
    const pattern = await this.determinePattern(userState, previousState, query);
    
    // Execute based on pattern
    let executions: ToolExecutionResult[];
    
    switch (pattern.type) {
      case 'handoff':
        executions = await this.executeHandoff(pattern, query, userState, sessionId);
        break;
      case 'parallel':
        executions = await this.executeParallel(pattern, query, userState, sessionId);
        break;
      case 'chain':
        executions = await this.executeChain(pattern, query, userState, sessionId);
        break;
      case 'fallback':
        executions = await this.executeFallback(pattern, query, userState, sessionId);
        break;
      default:
        // Single tool execution as default
        executions = await this.executeSingle(pattern.tools[0], query, userState, sessionId);
    }
    
    // Store execution history for session
    if (sessionId) {
      this.executionHistory.set(sessionId, executions);
    }
    
    // Calculate pattern effectiveness
    const effectiveness = this.calculatePatternEffectiveness(executions, userState);
    
    return {
      pattern,
      executions,
      metadata: {
        totalExecutionTime: Date.now() - startTime,
        toolCount: executions.length,
        patternEffectiveness: effectiveness
      }
    };
  }

  private async determinePattern(
    currentState: UserState,
    previousState: UserState | undefined,
    query: string
  ): Promise<OrchestrationPattern> {
    // Check for state changes that trigger patterns
    
    // 1. Handoff Pattern: Intent or depth change
    if (previousState && currentState.intent.changed) {
      const changeReason = typeof currentState.intent.changeReason === 'string' 
        ? currentState.intent.changeReason 
        : 'Intent shift detected';
      return {
        type: 'handoff',
        reason: changeReason,
        tools: [
          (typeof previousState.tooling.currentToolAppropriate === 'string' ? previousState.tooling.currentToolAppropriate : null) || 'socratic_tool',
          currentState.tooling.suggestedTool || 'socratic_tool'
        ],
        context: {
          previousIntent: previousState.intent.current,
          newIntent: currentState.intent.current,
          depthChange: currentState.depth.current !== previousState.depth.current
        }
      };
    }
    
    // 2. Chain Pattern: Depth progression
    if (previousState && currentState.depth.changeIndicator) {
      const tools = this.getDepthProgressionTools(
        currentState.intent.current,
        previousState.depth.current,
        currentState.depth.current
      );
      return {
        type: 'chain',
        reason: 'Depth progression detected',
        tools,
        context: {
          fromDepth: previousState.depth.current,
          toDepth: currentState.depth.current,
          intent: currentState.intent.current
        }
      };
    }
    
    // 3. Parallel Pattern: Multiple intents detected
    const intents = await this.detectMultipleIntents(query);
    if (intents.length > 1) {
      const tools = intents.map(intent => 
        this.intentRouter.selectToolForIntent(intent, currentState.depth.current)
      );
      return {
        type: 'parallel',
        reason: 'Multiple intents detected',
        tools,
        context: {
          intents,
          depth: currentState.depth.current
        }
      };
    }
    
    // 4. Fallback Pattern: High frustration or tool ineffectiveness (normalize to 0–1)
    if (this.normalizeFrustration(currentState.sentiment.frustrationLevel) >= 0.7) {
      return {
        type: 'fallback',
        reason: 'High frustration detected',
        tools: [
          currentState.tooling.suggestedTool || 'socratic_tool',
          'quick_answer',  // Fallback to direct answer
          'practical_guide' // Alternative approach
        ],
        context: {
          frustrationLevel: this.normalizeFrustration(currentState.sentiment.frustrationLevel),
          sentiment: currentState.sentiment.type
        }
      };
    }
    
    // Default: Single tool execution
    return {
      type: 'handoff', // Treat as simple handoff
      reason: 'Standard single tool execution',
      tools: [currentState.tooling.suggestedTool || 'socratic_tool']
    };
  }

  // Normalize frustration to a 0–1 scale for consistent comparisons
  private normalizeFrustration(level: number): number {
    if (level == null || Number.isNaN(level as any)) return 0;
    const numeric = Number(level);
    const scaled = numeric > 1 ? numeric / 10 : numeric;
    return Math.max(0, Math.min(1, scaled));
  }

  private async executeHandoff(
    pattern: OrchestrationPattern,
    query: string,
    userState: UserState,
    sessionId?: string
  ): Promise<ToolExecutionResult[]> {
    const executions: ToolExecutionResult[] = [];
    
    for (let i = 0; i < pattern.tools.length; i++) {
      const toolName = pattern.tools[i];
      const isTransition = i === 0 && pattern.tools.length > 1;
      
      // Add transition context for smooth handoff
      const context = isTransition ? {
        ...pattern.context,
        transitionMessage: `Transitioning from ${pattern.tools[0]} to ${pattern.tools[1]} due to ${pattern.reason}`
      } : pattern.context;
      
      const result = await this.executeTool(
        toolName,
        query,
        userState,
        context,
        sessionId
      );
      
      executions.push(result);
      
      // For handoff, only execute the second tool if first indicates need
      if (isTransition && result.success) {
        break; // Successful transition, no need for second tool
      }
    }
    
    return executions;
  }

  private async executeParallel(
    pattern: OrchestrationPattern,
    query: string,
    userState: UserState,
    sessionId?: string
  ): Promise<ToolExecutionResult[]> {
    // Execute all tools in parallel
    const executionPromises = pattern.tools.map(toolName =>
      this.executeTool(toolName, query, userState, pattern.context, sessionId)
    );
    
    const results = await Promise.allSettled(executionPromises);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          tool: pattern.tools[index],
          result: null,
          success: false,
          error: result.reason,
          executionTime: 0
        };
      }
    });
  }

  private async executeChain(
    pattern: OrchestrationPattern,
    query: string,
    userState: UserState,
    sessionId?: string
  ): Promise<ToolExecutionResult[]> {
    const executions: ToolExecutionResult[] = [];
    let currentQuery = query;
    let accumulatedContext = { ...pattern.context };
    
    for (const toolName of pattern.tools) {
      const result = await this.executeTool(
        toolName,
        currentQuery,
        userState,
        accumulatedContext,
        sessionId
      );
      
      executions.push(result);
      
      // Use output from previous tool as input to next
      if (result.success && result.result) {
        currentQuery = this.extractNextQuery(result.result, query);
        accumulatedContext = {
          ...accumulatedContext,
          previousToolOutput: result.result,
          chainStep: executions.length
        };
      } else {
        break; // Chain broken due to failure
      }
    }
    
    return executions;
  }

  private async executeFallback(
    pattern: OrchestrationPattern,
    query: string,
    userState: UserState,
    sessionId?: string
  ): Promise<ToolExecutionResult[]> {
    const executions: ToolExecutionResult[] = [];
    
    for (const toolName of pattern.tools) {
      const result = await this.executeTool(
        toolName,
        query,
        userState,
        pattern.context,
        sessionId
      );
      
      executions.push(result);
      
      // Stop at first successful execution
      if (result.success) {
        break;
      }
    }
    
    // If all tools failed, add a final fallback message
    if (executions.every(e => !e.success)) {
      executions.push({
        tool: 'system_fallback',
        result: {
          response: "I understand you're looking for help. Let me connect you with a more direct approach or additional resources."
        },
        success: true,
        executionTime: 0
      });
    }
    
    return executions;
  }

  private async executeSingle(
    toolName: string,
    query: string,
    userState: UserState,
    sessionId?: string
  ): Promise<ToolExecutionResult[]> {
    const result = await this.executeTool(
      toolName,
      query,
      userState,
      {},
      sessionId
    );
    
    return [result];
  }

  private async executeTool(
    toolName: string,
    query: string,
    userState: UserState,
    context?: Record<string, any>,
    sessionId?: string
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Get tool configuration
      const tool = await this.ellenTools.getTool(toolName);
      
      if (!tool) {
        throw new Error(`Tool ${toolName} not found`);
      }
      
      // Prepare tool input with context
      const toolInput = {
        query,
        userState,
        context,
        sessionId
      };
      
      // Execute tool
      const result = await tool.execute(toolInput);
      
      return {
        tool: toolName,
        result,
        success: true,
        executionTime: Date.now() - startTime,
        context
      };
    } catch (error) {
      return {
        tool: toolName,
        result: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        context
      };
    }
  }

  private async detectMultipleIntents(query: string): Promise<string[]> {
    // Use LLM to detect multiple intents in the query
    const prompt = `Analyze this query and identify all learning intents present. Return only the intent labels separated by commas.

Query: "${query}"

Possible intents: understand, create, solve, evaluate, organize, regulate, explore, interact

Return format: intent1,intent2,intent3`;

    try {
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt,
        temperature: 0.3
      });
      
      return text.split(',').map(i => i.trim()).filter(i => i.length > 0);
    } catch {
      return ['understand']; // Default to single intent
    }
  }

  private getDepthProgressionTools(
    intent: string,
    fromDepth: string,
    toDepth: string
  ): string[] {
    const progressionMap: Record<string, Record<string, string[]>> = {
      'surface_to_guided': {
        'understand': ['quick_answer', 'socratic_tool'],
        'create': ['writing_assistant', 'project_ideation_tool'],
        'solve': ['problem_solver', 'socratic_tool'],
        'evaluate': ['evaluator_tool', 'review_tool']
      },
      'guided_to_deep': {
        'understand': ['socratic_tool', 'concept_mapper'],
        'create': ['project_ideation_tool', 'writing_assistant'],
        'solve': ['problem_solver', 'breakthrough_tool'],
        'evaluate': ['evaluator_tool', 'critical_analysis_tool']
      },
      'surface_to_deep': {
        'understand': ['quick_answer', 'socratic_tool', 'concept_mapper'],
        'create': ['writing_assistant', 'project_ideation_tool', 'creative_exploration_tool'],
        'solve': ['problem_solver', 'socratic_tool', 'breakthrough_tool'],
        'evaluate': ['evaluator_tool', 'review_tool', 'critical_analysis_tool']
      }
    };
    
    const progressionKey = `${fromDepth}_to_${toDepth}`;
    return progressionMap[progressionKey]?.[intent] || ['socratic_tool'];
  }

  private extractNextQuery(previousResult: any, originalQuery: string): string {
    // Extract relevant information from previous tool output to form next query
    if (typeof previousResult === 'string') {
      return previousResult;
    }
    
    if (previousResult.nextQuery) {
      return previousResult.nextQuery;
    }
    
    if (previousResult.response) {
      return `Based on: ${previousResult.response.substring(0, 100)}... Continue with: ${originalQuery}`;
    }
    
    return originalQuery;
  }

  private calculatePatternEffectiveness(
    executions: ToolExecutionResult[],
    userState: UserState
  ): number {
    let score = 0;
    const weights = {
      success: 0.4,
      speed: 0.2,
      appropriateness: 0.3,
      sentiment: 0.1
    };
    
    // Success rate
    const successRate = executions.filter(e => e.success).length / executions.length;
    score += successRate * weights.success;
    
    // Speed (penalize if total time > 3000ms)
    const totalTime = executions.reduce((sum, e) => sum + e.executionTime, 0);
    const speedScore = Math.max(0, 1 - (totalTime - 3000) / 3000);
    score += speedScore * weights.speed;
    
    // Tool appropriateness
    const appropriateTools = executions.filter(e => 
      e.tool === userState.tooling.suggestedTool ||
      (typeof userState.tooling.currentToolAppropriate === 'string' && e.tool === userState.tooling.currentToolAppropriate)
    ).length / executions.length;
    score += appropriateTools * weights.appropriateness;
    
    // Sentiment improvement potential
    const sentimentScore = userState.sentiment.type === 'positive' ? 1 :
                          userState.sentiment.type === 'neutral' ? 0.7 :
                          0.3;
    score += sentimentScore * weights.sentiment;
    
    return Math.min(1, Math.max(0, score));
  }
}

// Multi-Tool Optimizer for pre-warming and optimization
export class MultiToolOptimizer {
  private preWarmCache: Map<string, any> = new Map();
  private patternHistory: Map<string, OrchestrationPattern[]> = new Map();
  
  async preWarmTools(
    predictedTools: string[],
    context: Record<string, any>
  ): Promise<void> {
    // Pre-load tool configurations and warm up caches
    const warmUpPromises = predictedTools.map(async toolName => {
      const cacheKey = `${toolName}_${JSON.stringify(context)}`;
      
      if (!this.preWarmCache.has(cacheKey)) {
        // Simulate pre-warming by loading tool config
        const warmUpData = {
          tool: toolName,
          context,
          timestamp: Date.now()
        };
        
        this.preWarmCache.set(cacheKey, warmUpData);
      }
    });
    
    await Promise.all(warmUpPromises);
  }
  
  predictNextTools(
    sessionId: string,
    currentState: UserState,
    recentPatterns: OrchestrationPattern[]
  ): string[] {
    // Analyze recent patterns to predict likely next tools
    const sessionPatterns = this.patternHistory.get(sessionId) || [];
    const allPatterns = [...sessionPatterns, ...recentPatterns];
    
    // Find most common next tools based on pattern
    const toolFrequency = new Map<string, number>();
    
    allPatterns.forEach(pattern => {
      pattern.tools.forEach(tool => {
        toolFrequency.set(tool, (toolFrequency.get(tool) || 0) + 1);
      });
    });
    
    // Sort by frequency and return top 3
    const sortedTools = Array.from(toolFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tool]) => tool);
    
    // Add state-suggested tool if not already included
    if (currentState.tooling.suggestedTool && 
        !sortedTools.includes(currentState.tooling.suggestedTool)) {
      sortedTools.push(currentState.tooling.suggestedTool);
    }
    
    return sortedTools;
  }
  
  recordPattern(sessionId: string, pattern: OrchestrationPattern): void {
    const patterns = this.patternHistory.get(sessionId) || [];
    patterns.push(pattern);
    
    // Keep only last 10 patterns per session
    if (patterns.length > 10) {
      patterns.shift();
    }
    
    this.patternHistory.set(sessionId, patterns);
  }
  
  getOptimizationMetrics(): Record<string, any> {
    return {
      cacheSize: this.preWarmCache.size,
      sessionsTracked: this.patternHistory.size,
      totalPatternsRecorded: Array.from(this.patternHistory.values())
        .reduce((sum, patterns) => sum + patterns.length, 0),
      cacheHitRate: this.calculateCacheHitRate()
    };
  }
  
  private calculateCacheHitRate(): number {
    // This would track actual cache hits in production
    // For now, return a simulated value
    return 0.65;
  }
  
  clearOldCache(maxAge: number = 3600000): void {
    // Clear cache entries older than maxAge (default 1 hour)
    const now = Date.now();
    
    for (const [key, value] of this.preWarmCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.preWarmCache.delete(key);
      }
    }
  }
}
