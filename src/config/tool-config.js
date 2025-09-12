"use strict";
/**
 * Tool Configuration Matrix
 * Defines the operational requirements for each Ellen tool
 *
 * Model Tiers:
 * 1 - Simple/Fast: High-volume, low-complexity operations
 * 2 - Balanced: Standard tutoring requiring nuanced understanding
 * 3 - Complex & Diagnostics: Deep reasoning and problem-solving
 * 4 - Frontier: State-of-the-art AI for premium experiences
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_CONFIG = void 0;
exports.getToolConfig = getToolConfig;
exports.toolNeedsRetrieval = toolNeedsRetrieval;
exports.getToolModelTier = getToolModelTier;
exports.getToolContextStrategy = getToolContextStrategy;
exports.TOOL_CONFIG = {
    // Core Pedagogical Tools
    socratic_tool: {
        needsRetrieval: true,
        contextStrategy: 'recent',
        modelTier: 2,
        category: 'pedagogical',
        description: 'Needs content for questioning, recent context for continuity',
        rationale: 'Tier 2: Requires nuanced questioning and pedagogical understanding'
    },
    reflection_tool: {
        needsRetrieval: false,
        contextStrategy: 'minimal',
        modelTier: 1,
        category: 'pedagogical',
        description: 'Works on user feelings, no content needed',
        rationale: 'Tier 1: Simple emotional processing and reflection prompts'
    },
    extension_tool: {
        needsRetrieval: true,
        contextStrategy: 'recent',
        modelTier: 2,
        category: 'pedagogical',
        description: 'Needs content for applications and connections',
        rationale: 'Tier 2: Requires creative connections and application generation'
    },
    genealogy_tool: {
        needsRetrieval: true,
        contextStrategy: 'minimal',
        modelTier: 3,
        category: 'pedagogical',
        description: 'Needs historical content, minimal context',
        rationale: 'Tier 3: Complex knowledge graph navigation and connections'
    },
    // Coaching Tools
    writing_coach: {
        needsRetrieval: false,
        contextStrategy: 'full', // Needs all revisions
        modelTier: 2,
        category: 'coaching',
        description: 'Tracks revision history, needs full context',
        rationale: 'Tier 2: Detailed writing feedback requires nuanced understanding'
    },
    note_assistant: {
        needsRetrieval: false,
        contextStrategy: 'minimal',
        modelTier: 1,
        category: 'coaching',
        description: 'Works on user notes, minimal context',
        rationale: 'Tier 1: Basic note formatting and organization'
    },
    office_hours_coach: {
        needsRetrieval: false,
        contextStrategy: 'goals',
        modelTier: 2,
        category: 'coaching',
        description: 'Needs goals and constraints for preparation',
        rationale: 'Tier 2: Strategic preparation requires understanding context'
    },
    email_coach: {
        needsRetrieval: false,
        contextStrategy: 'minimal',
        modelTier: 2,
        category: 'coaching',
        description: 'Works on provided email text',
        rationale: 'Tier 2: Professional communication requires nuanced tone'
    },
    // Planning Tools
    plan_manager: {
        needsRetrieval: false,
        contextStrategy: 'goals',
        modelTier: 1,
        category: 'planning',
        description: 'Needs goals and constraints, no content',
        rationale: 'Tier 1: Basic goal structuring and task organization'
    },
    focus_session: {
        needsRetrieval: false,
        contextStrategy: 'minimal',
        modelTier: 1,
        category: 'planning',
        description: 'Session management, minimal context',
        rationale: 'Tier 1: Simple timer and session management'
    },
    // Diagnostic Tools
    learning_diagnostic: {
        needsRetrieval: false,
        contextStrategy: 'recent',
        modelTier: 3,
        category: 'diagnostic',
        description: 'Analyzes learning patterns, needs recent context',
        rationale: 'Tier 3: Complex pattern analysis and diagnostic reasoning'
    },
    strategy_selector: {
        needsRetrieval: true,
        contextStrategy: 'goals',
        modelTier: 3,
        category: 'diagnostic',
        description: 'Matches strategies to goals',
        rationale: 'Tier 3: Strategic matching requires analytical reasoning'
    },
    troubleshooter: {
        needsRetrieval: true,
        contextStrategy: 'recent',
        modelTier: 3,
        category: 'diagnostic',
        description: 'Diagnoses problems, needs context and content',
        rationale: 'Tier 3: Systematic problem-solving and root cause analysis'
    },
    metacognitive_calibration: {
        needsRetrieval: false,
        contextStrategy: 'recent',
        modelTier: 3,
        category: 'diagnostic',
        description: 'Assesses understanding accuracy',
        rationale: 'Tier 3: Accuracy assessment requires analytical evaluation'
    },
    // Strategy Implementation
    retrieval: {
        needsRetrieval: true,
        contextStrategy: 'minimal',
        modelTier: 1,
        category: 'utility',
        description: 'Tests knowledge, needs content for answers',
        rationale: 'Tier 1: Simple retrieval and answer checking'
    },
    retrieval_practice: {
        needsRetrieval: true,
        contextStrategy: 'minimal',
        modelTier: 1,
        category: 'utility',
        description: 'Active recall practice',
        rationale: 'Tier 1: Basic recall testing and verification'
    },
    self_explanation: {
        needsRetrieval: false,
        contextStrategy: 'recent',
        modelTier: 1,
        category: 'utility',
        description: 'User explains concepts, no retrieval needed',
        rationale: 'Tier 1: Simple prompting for user explanations'
    },
    dual_coding: {
        needsRetrieval: true,
        contextStrategy: 'minimal',
        modelTier: 2,
        category: 'utility',
        description: 'Visual + verbal, needs content',
        rationale: 'Tier 2: Multimodal representation requires creativity'
    },
    desirable_difficulties: {
        needsRetrieval: true,
        contextStrategy: 'recent',
        modelTier: 2,
        category: 'utility',
        description: 'Creates challenges, needs content',
        rationale: 'Tier 2: Creating appropriate challenges requires pedagogical understanding'
    },
    // Study Utilities
    flashcard_generator: {
        needsRetrieval: true,
        contextStrategy: 'minimal',
        modelTier: 1,
        category: 'utility',
        description: 'Creates cards from content',
        rationale: 'Tier 1: Pattern extraction for flashcard creation'
    },
    concept_mapper: {
        needsRetrieval: true,
        contextStrategy: 'minimal',
        modelTier: 1,
        category: 'utility',
        description: 'Maps relationships in content',
        rationale: 'Tier 1: Basic relationship mapping'
    },
    concept_map: {
        needsRetrieval: true,
        contextStrategy: 'minimal',
        modelTier: 1,
        category: 'utility',
        description: 'Alternative name for concept_mapper',
        rationale: 'Tier 1: Basic relationship mapping'
    },
    worked_example: {
        needsRetrieval: true,
        contextStrategy: 'minimal',
        modelTier: 3,
        category: 'utility',
        description: 'Step-by-step solutions',
        rationale: 'Tier 3: Step-by-step problem solving requires logical reasoning'
    },
    example_walker: {
        needsRetrieval: true,
        contextStrategy: 'minimal',
        modelTier: 3,
        category: 'utility',
        description: 'Alternative name for worked_example',
        rationale: 'Tier 3: Step-by-step problem solving requires logical reasoning'
    },
    analogy_builder: {
        needsRetrieval: true,
        contextStrategy: 'minimal',
        modelTier: 2,
        category: 'utility',
        description: 'Creates comparisons, needs creativity',
        rationale: 'Tier 2: Creative analogy generation requires nuanced understanding'
    },
    // Growth Tracking
    growth_compass_tracker: {
        needsRetrieval: false,
        contextStrategy: 'summary',
        modelTier: 2,
        category: 'diagnostic',
        description: 'Analyzes patterns, needs summarized history',
        rationale: 'Tier 2: Pattern analysis with contextual understanding'
    }
};
// Helper functions
function getToolConfig(toolName) {
    return exports.TOOL_CONFIG[toolName] || exports.TOOL_CONFIG.socratic_tool;
}
function toolNeedsRetrieval(toolName) {
    return getToolConfig(toolName).needsRetrieval;
}
function getToolModelTier(toolName) {
    return getToolConfig(toolName).modelTier;
}
function getToolContextStrategy(toolName) {
    return getToolConfig(toolName).contextStrategy;
}
