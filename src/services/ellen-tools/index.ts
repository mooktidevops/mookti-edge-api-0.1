/**
 * Ellen Tools Master Index
 * 
 * Unified access point for all Ellen's pedagogical, coaching,
 * planning, and diagnostic tools.
 */

export * from './research-foundations';
export * from './core-tools';
export * from './coaching-tools';
export * from './planning-tools';
export * from './strategy-diagnostic-tools';
export * from './strategy-implementations';
export * from './study-utilities';

import { EllenToolOrchestrator, ToolContext, ToolResponse } from './core-tools';
import { CoachingToolsOrchestrator, CoachingContext, CoachingResponse } from './coaching-tools';
import { PlanningToolsOrchestrator, PlanningContext, StudyPlan } from './planning-tools';
import { StrategyDiagnosticOrchestrator, DiagnosticContext, DiagnosticResult } from './strategy-diagnostic-tools';
import { StrategyImplementationOrchestrator, StrategyContext, StrategyOutput } from './strategy-implementations';
import { StudyUtilitiesOrchestrator, StudyContext } from './study-utilities';
import { ModelRoutingResult } from '../../../lib/ai/model-router';

/**
 * Master Ellen Tools Orchestrator
 * Intelligently routes to the appropriate tool based on context
 */
export class EllenMasterOrchestrator {
  private coreTools = new EllenToolOrchestrator();
  private coachingTools = new CoachingToolsOrchestrator();
  private planningTools = new PlanningToolsOrchestrator();
  private diagnosticTools = new StrategyDiagnosticOrchestrator();
  private strategyTools = new StrategyImplementationOrchestrator();
  private studyUtilities = new StudyUtilitiesOrchestrator();

  /**
   * Main entry point for tool execution
   */
  async execute(
    userMessage: string,
    toolName?: string,
    context?: Partial<ToolContext & CoachingContext & PlanningContext & DiagnosticContext & StrategyContext & StudyContext>,
    modelRouting?: ModelRoutingResult
  ): Promise<ToolResponse | CoachingResponse | StudyPlan | DiagnosticResult | StrategyOutput | any> {
    // If specific tool is named, route directly
    if (toolName) {
      return this.executeSpecificTool(toolName, userMessage, context, modelRouting!);
    }

    // Otherwise, intelligently categorize and route
    const category = this.categorizeRequest(userMessage, context);
    return this.executeByCategory(category, userMessage, context, modelRouting!);
  }

  /**
   * Categorize the request to determine which tool set to use
   */
  private categorizeRequest(
    message: string, 
    context?: Partial<ToolContext & CoachingContext & PlanningContext & DiagnosticContext & StrategyContext & StudyContext>
  ): 'core' | 'coaching' | 'planning' | 'diagnostic' | 'strategy' | 'utility' {
    const lowerMessage = message.toLowerCase();

    // Diagnostic indicators (problems, struggles)
    if (lowerMessage.includes('problem') || lowerMessage.includes('struggling') ||
        lowerMessage.includes('difficulty') || lowerMessage.includes('can\'t') ||
        lowerMessage.includes('forget') || lowerMessage.includes('anxiety')) {
      return 'diagnostic';
    }

    // Planning indicators (schedule, plan, WOOP, focus session)
    if (lowerMessage.includes('plan') || lowerMessage.includes('schedule') ||
        lowerMessage.includes('woop') || lowerMessage.includes('pomodoro') ||
        lowerMessage.includes('focus') || lowerMessage.includes('session')) {
      return 'planning';
    }

    // Coaching indicators (writing, notes, email, office hours)
    if (lowerMessage.includes('write') || lowerMessage.includes('essay') ||
        lowerMessage.includes('email') || lowerMessage.includes('note') ||
        lowerMessage.includes('office hour') || lowerMessage.includes('professor')) {
      return 'coaching';
    }

    // Strategy indicators (retrieval, self-explanation, dual coding)
    if (lowerMessage.includes('retrieval') || lowerMessage.includes('practice') ||
        lowerMessage.includes('self-explain') || lowerMessage.includes('dual cod') ||
        lowerMessage.includes('desirable difficult')) {
      return 'strategy';
    }

    // Study utility indicators (flashcard, concept map, example, analogy)
    if (lowerMessage.includes('flashcard') || lowerMessage.includes('concept map') ||
        lowerMessage.includes('worked example') || lowerMessage.includes('analogy') ||
        lowerMessage.includes('memorize')) {
      return 'utility';
    }

    // Core pedagogical (default for learning questions)
    return 'core';
  }

  /**
   * Execute tool based on category
   */
  private async executeByCategory(
    category: 'core' | 'coaching' | 'planning' | 'diagnostic' | 'strategy' | 'utility',
    userMessage: string,
    context?: Partial<ToolContext & CoachingContext & PlanningContext & DiagnosticContext & StrategyContext & StudyContext>,
    modelRouting?: ModelRoutingResult
  ): Promise<ToolResponse | CoachingResponse | StudyPlan | DiagnosticResult | StrategyOutput | any> {
    const baseContext = {
      userMessage,
      modelRouting: modelRouting!,
      ...context
    };

    switch (category) {
      case 'core':
        return this.coreTools.selectAndExecute(baseContext as ToolContext);
      
      case 'coaching':
        return this.coachingTools.selectAndExecute(baseContext as CoachingContext);
      
      case 'planning':
        return this.planningTools.selectAndExecute(baseContext as PlanningContext);
      
      case 'diagnostic':
        return this.diagnosticTools.selectAndExecute(baseContext as DiagnosticContext);
      
      case 'strategy':
        return this.strategyTools.selectAndExecute(baseContext as StrategyContext);
      
      case 'utility':
        return this.studyUtilities.selectAndExecute(baseContext as StudyContext);
      
      default:
        return this.coreTools.selectAndExecute(baseContext as ToolContext);
    }
  }

  /**
   * Execute a specific named tool
   */
  private async executeSpecificTool(
    toolName: string,
    userMessage: string,
    context?: Partial<ToolContext & CoachingContext & PlanningContext & DiagnosticContext & StrategyContext & StudyContext>,
    modelRouting?: ModelRoutingResult
  ): Promise<ToolResponse | CoachingResponse | StudyPlan | DiagnosticResult | StrategyOutput | any> {
    const baseContext = {
      userMessage,
      modelRouting: modelRouting!,
      ...context
    };

    // Core tools
    const coreToolNames = ['socratic', 'reflection', 'extension', 'genealogy'];
    if (coreToolNames.includes(toolName)) {
      return this.coreTools.selectAndExecute(baseContext as ToolContext, toolName);
    }

    // Coaching tools
    const coachingToolNames = ['writing_coach', 'note_assistant', 'office_hours_coach', 'email_coach'];
    if (coachingToolNames.includes(toolName)) {
      return this.coachingTools.selectAndExecute(baseContext as CoachingContext, toolName);
    }

    // Planning tools
    const planningToolNames = ['plan_manager', 'focus_session'];
    if (planningToolNames.includes(toolName)) {
      return this.planningTools.selectAndExecute(baseContext as PlanningContext, toolName);
    }

    // Diagnostic tools
    const diagnosticToolNames = ['learning_diagnostic', 'strategy_selector', 'metacognitive_calibration'];
    if (diagnosticToolNames.includes(toolName)) {
      return this.diagnosticTools.selectAndExecute(baseContext as DiagnosticContext, toolName);
    }

    // Strategy implementation tools
    const strategyToolNames = ['troubleshooter', 'retrieval', 'self_explanation', 'dual_coding', 'desirable_difficulties'];
    if (strategyToolNames.includes(toolName)) {
      return this.strategyTools.selectAndExecute(baseContext as StrategyContext, toolName);
    }

    // Study utility tools
    const utilityToolNames = ['flashcard', 'flashcard_generator', 'concept_map', 'concept_mapper', 'worked_example', 'example_walker', 'analogy', 'analogy_builder'];
    if (utilityToolNames.includes(toolName)) {
      return this.studyUtilities.selectAndExecute(baseContext as StudyContext, toolName);
    }

    // Default to core Socratic tool
    return this.coreTools.selectAndExecute(baseContext as ToolContext, 'socratic');
  }

  /**
   * Get tool recommendations based on learning patterns
   */
  getToolRecommendations(
    recentTools: string[],
    performanceMetrics?: any
  ): string[] {
    const recommendations: string[] = [];

    // If heavily using Socratic, suggest reflection
    if (recentTools.filter(t => t === 'socratic').length > 3) {
      recommendations.push('Try the reflection tool to consolidate your learning');
    }

    // If struggling (based on metrics), suggest diagnostic
    if (performanceMetrics?.strugglingIndicators) {
      recommendations.push('The learning diagnostic tool can help identify specific challenges');
    }

    // If planning-focused, suggest WOOP
    if (recentTools.includes('plan_manager') && !recentTools.includes('woop')) {
      recommendations.push('Consider using WOOP mental contrasting for better goal achievement');
    }

    // If writing frequently, suggest writing coach
    if (recentTools.filter(t => t.includes('write')).length > 2) {
      recommendations.push('The writing coach can help improve your academic writing');
    }

    return recommendations;
  }

  /**
   * Analyze tool usage patterns for Growth Compass
   */
  analyzeToolUsagePatterns(
    toolHistory: Array<{ tool: string; timestamp: Date; outcome?: string }>
  ): {
    preferredTools: string[];
    learningStyle: string;
    recommendations: string[];
  } {
    const toolCounts = toolHistory.reduce((acc, entry) => {
      acc[entry.tool] = (acc[entry.tool] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const preferredTools = Object.entries(toolCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([tool]) => tool);

    // Infer learning style from tool preferences
    let learningStyle = 'Balanced';
    if (preferredTools.includes('socratic') || preferredTools.includes('reflection')) {
      learningStyle = 'Deep Processor';
    } else if (preferredTools.includes('plan_manager') || preferredTools.includes('focus_session')) {
      learningStyle = 'Structured Planner';
    } else if (preferredTools.includes('writing_coach') || preferredTools.includes('note_assistant')) {
      learningStyle = 'Active Producer';
    }

    const recommendations = this.getToolRecommendations(
      toolHistory.map(h => h.tool),
      { strugglingIndicators: false }
    );

    return {
      preferredTools,
      learningStyle,
      recommendations
    };
  }
}

// Export singleton instance
export const ellenTools = new EllenMasterOrchestrator();

// Tool name constants for type safety
export const ELLEN_TOOLS = {
  // Core Pedagogical
  SOCRATIC: 'socratic',
  REFLECTION: 'reflection',
  EXTENSION: 'extension',
  GENEALOGY: 'genealogy',
  
  // Coaching
  WRITING_COACH: 'writing_coach',
  NOTE_ASSISTANT: 'note_assistant',
  OFFICE_HOURS: 'office_hours_coach',
  EMAIL_COACH: 'email_coach',
  
  // Planning
  PLAN_MANAGER: 'plan_manager',
  FOCUS_SESSION: 'focus_session',
  
  // Diagnostic
  LEARNING_DIAGNOSTIC: 'learning_diagnostic',
  STRATEGY_SELECTOR: 'strategy_selector',
  METACOGNITIVE_CALIBRATION: 'metacognitive_calibration',
  
  // Strategy Implementations
  CLASS_TROUBLESHOOTER: 'troubleshooter',
  RETRIEVAL_PRACTICE: 'retrieval',
  SELF_EXPLANATION: 'self_explanation',
  DUAL_CODING: 'dual_coding',
  DESIRABLE_DIFFICULTIES: 'desirable_difficulties',
  
  // Study Utilities
  FLASHCARD_GENERATOR: 'flashcard_generator',
  CONCEPT_MAPPER: 'concept_mapper',
  WORKED_EXAMPLE: 'worked_example',
  ANALOGY_BUILDER: 'analogy_builder'
} as const;

export type EllenToolName = typeof ELLEN_TOOLS[keyof typeof ELLEN_TOOLS];