"use strict";
/**
 * Ellen Tools Master Index
 *
 * Unified access point for all Ellen's pedagogical, coaching,
 * planning, and diagnostic tools.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ELLEN_TOOLS = exports.ellenTools = exports.EllenMasterOrchestrator = void 0;
__exportStar(require("./research-foundations"), exports);
__exportStar(require("./core-tools"), exports);
__exportStar(require("./coaching-tools"), exports);
__exportStar(require("./planning-tools"), exports);
__exportStar(require("./strategy-diagnostic-tools"), exports);
__exportStar(require("./strategy-implementations"), exports);
__exportStar(require("./study-utilities"), exports);
// V2 Tools
__exportStar(require("./quick-answer-tool"), exports);
__exportStar(require("./practical-guide-tool"), exports);
__exportStar(require("./problem-solver-tool"), exports);
__exportStar(require("./evaluator-tool"), exports);
__exportStar(require("./intent-router-tool"), exports);
const core_tools_1 = require("./core-tools");
const coaching_tools_1 = require("./coaching-tools");
const planning_tools_1 = require("./planning-tools");
const strategy_diagnostic_tools_1 = require("./strategy-diagnostic-tools");
const strategy_implementations_1 = require("./strategy-implementations");
const study_utilities_1 = require("./study-utilities");
/**
 * Master Ellen Tools Orchestrator
 * Intelligently routes to the appropriate tool based on context
 */
class EllenMasterOrchestrator {
    coreTools = new core_tools_1.EllenToolOrchestrator();
    coachingTools = new coaching_tools_1.CoachingToolsOrchestrator();
    planningTools = new planning_tools_1.PlanningToolsOrchestrator();
    diagnosticTools = new strategy_diagnostic_tools_1.StrategyDiagnosticOrchestrator();
    strategyTools = new strategy_implementations_1.StrategyImplementationOrchestrator();
    studyUtilities = new study_utilities_1.StudyUtilitiesOrchestrator();
    /**
     * Main entry point for tool execution
     */
    async execute(userMessage, toolName, context, modelRouting) {
        // If specific tool is named, route directly
        if (toolName) {
            return this.executeSpecificTool(toolName, userMessage, context, modelRouting);
        }
        // Otherwise, intelligently categorize and route
        const category = this.categorizeRequest(userMessage, context);
        return this.executeByCategory(category, userMessage, context, modelRouting);
    }
    /**
     * DEPRECATED: Legacy categorization - V2 uses UserStateMonitor and IntentRouter
     *
     * This method is only called when no specific tool is provided, which shouldn't
     * happen with V2 orchestration. The sophisticated LLM-based routing in
     * UserStateMonitor and IntentRouter handles tool selection much more accurately.
     *
     * @deprecated Use UserStateMonitor.selectToolFromState() instead
     */
    categorizeRequest(message, context) {
        // V2: This should rarely be called as tools are selected upstream
        // Default to 'core' and let the orchestrator handle proper routing
        console.warn('[EllenTools] categorizeRequest called without specific tool - this indicates V2 routing may not be working properly');
        // Simple fallback - no regex needed since V2 handles this better
        return 'core';
    }
    /**
     * Execute tool based on category
     */
    async executeByCategory(category, userMessage, context, modelRouting) {
        const baseContext = {
            userMessage,
            modelRouting: modelRouting,
            ...context
        };
        switch (category) {
            case 'core':
                return this.coreTools.selectAndExecute(baseContext);
            case 'coaching':
                return this.coachingTools.selectAndExecute(baseContext);
            case 'planning':
                return this.planningTools.selectAndExecute(baseContext);
            case 'diagnostic':
                return this.diagnosticTools.selectAndExecute(baseContext);
            case 'strategy':
                return this.strategyTools.selectAndExecute(baseContext);
            case 'utility':
                return this.studyUtilities.selectAndExecute(baseContext);
            default:
                return this.coreTools.selectAndExecute(baseContext);
        }
    }
    /**
     * Execute a specific named tool
     */
    async executeSpecificTool(toolName, userMessage, context, modelRouting) {
        const baseContext = {
            userMessage,
            modelRouting: modelRouting,
            ...context
        };
        // Core tools
        const coreToolNames = ['socratic', 'reflection', 'extension', 'genealogy'];
        if (coreToolNames.includes(toolName)) {
            return this.coreTools.selectAndExecute(baseContext, toolName);
        }
        // Coaching tools
        const coachingToolNames = ['writing_coach', 'note_assistant', 'office_hours_coach', 'email_coach'];
        if (coachingToolNames.includes(toolName)) {
            return this.coachingTools.selectAndExecute(baseContext, toolName);
        }
        // Planning tools
        const planningToolNames = ['plan_manager', 'focus_session'];
        if (planningToolNames.includes(toolName)) {
            return this.planningTools.selectAndExecute(baseContext, toolName);
        }
        // Diagnostic tools
        const diagnosticToolNames = ['learning_diagnostic', 'strategy_selector', 'metacognitive_calibration'];
        if (diagnosticToolNames.includes(toolName)) {
            return this.diagnosticTools.selectAndExecute(baseContext, toolName);
        }
        // Strategy implementation tools
        const strategyToolNames = ['troubleshooter', 'retrieval', 'self_explanation', 'dual_coding', 'desirable_difficulties'];
        if (strategyToolNames.includes(toolName)) {
            return this.strategyTools.selectAndExecute(baseContext, toolName);
        }
        // Study utility tools
        const utilityToolNames = ['flashcard', 'flashcard_generator', 'concept_map', 'concept_mapper', 'worked_example', 'example_walker', 'analogy', 'analogy_builder'];
        if (utilityToolNames.includes(toolName)) {
            return this.studyUtilities.selectAndExecute(baseContext, toolName);
        }
        // Default to core Socratic tool
        return this.coreTools.selectAndExecute(baseContext, 'socratic');
    }
    /**
     * Get tool recommendations based on learning patterns
     */
    getToolRecommendations(recentTools, performanceMetrics) {
        const recommendations = [];
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
    analyzeToolUsagePatterns(toolHistory) {
        const toolCounts = toolHistory.reduce((acc, entry) => {
            acc[entry.tool] = (acc[entry.tool] || 0) + 1;
            return acc;
        }, {});
        const preferredTools = Object.entries(toolCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([tool]) => tool);
        // Infer learning style from tool preferences
        let learningStyle = 'Balanced';
        if (preferredTools.includes('socratic') || preferredTools.includes('reflection')) {
            learningStyle = 'Deep Processor';
        }
        else if (preferredTools.includes('plan_manager') || preferredTools.includes('focus_session')) {
            learningStyle = 'Structured Planner';
        }
        else if (preferredTools.includes('writing_coach') || preferredTools.includes('note_assistant')) {
            learningStyle = 'Active Producer';
        }
        const recommendations = this.getToolRecommendations(toolHistory.map(h => h.tool), { strugglingIndicators: false });
        return {
            preferredTools,
            learningStyle,
            recommendations
        };
    }
}
exports.EllenMasterOrchestrator = EllenMasterOrchestrator;
// Export singleton instance
exports.ellenTools = new EllenMasterOrchestrator();
// Tool name constants for type safety
exports.ELLEN_TOOLS = {
    // Core Pedagogical
    SOCRATIC: 'socratic',
    REFLECTION: 'reflection',
    EXTENSION: 'extension',
    GENEALOGY: 'genealogy',
    // V2 Intent-Based Tools
    QUICK_ANSWER: 'quick_answer',
    PRACTICAL_GUIDE: 'practical_guide',
    PROBLEM_SOLVER: 'problem_solver',
    EVALUATOR: 'evaluator_tool',
    INTENT_ROUTER: 'intent_router',
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
};
