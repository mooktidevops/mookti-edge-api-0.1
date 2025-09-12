"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intentRouter = exports.IntentRouterTool = void 0;
const ai_1 = require("ai");
const model_selection_1 = require("../model-selection");
class IntentRouterTool {
    toolMatrix = {
        understand: {
            surface: 'quick_answer', // NEW - to be implemented
            guided: 'practical_guide', // NEW - to be implemented
            deep: 'socratic_tool'
        },
        create: {
            surface: 'email_coach',
            guided: 'writing_coach',
            deep: 'writing_coach'
        },
        solve: {
            surface: 'problem_solver', // NEW - to be implemented
            guided: 'problem_solver', // NEW - to be implemented
            deep: 'problem_solver' // NEW - to be implemented
        },
        evaluate: {
            surface: 'evaluator_tool', // NEW - to be implemented
            guided: 'evaluator_tool', // NEW - to be implemented
            deep: 'reflection_tool'
        },
        organize: {
            surface: 'focus_session',
            guided: 'plan_manager',
            deep: 'plan_manager'
        },
        regulate: {
            surface: 'reflection_tool',
            guided: 'reflection_tool',
            deep: 'growth_compass_tracker'
        },
        explore: {
            surface: 'retrieval_aggregator',
            guided: 'concept_mapper',
            deep: 'genealogy_tool'
        },
        interact: {
            surface: 'quick_answer', // NEW - to be implemented
            guided: 'office_hours_coach',
            deep: 'office_hours_coach'
        }
    };
    // Fallback mapping for tools not yet implemented
    fallbackTools = {
        'quick_answer': 'socratic_tool',
        'practical_guide': 'socratic_tool',
        'problem_solver': 'socratic_tool',
        'evaluator_tool': 'reflection_tool'
    };
    async execute(context) {
        const intent = await this.analyzeIntent(context);
        // If confidence is high, route directly
        if (intent.confidence > 0.8) {
            const tools = this.routeToTools(intent);
            intent.selectedTools = tools;
            return intent;
        }
        // Otherwise, add clarification
        intent.needsClarification = true;
        intent.clarificationPrompt = this.generateClarificationPrompt(intent);
        intent.selectedTools = [this.getDefaultTool(intent)];
        return intent;
    }
    async analyzeIntent(context) {
        const { model } = model_selection_1.modelSelection.selectModel({
            requiresReasoning: true
        });
        const systemPrompt = `Analyze the user's learning intent using a 2D matrix approach.

LEARNING INTENTS (can be multiple - identify primary and secondary if present):
- understand: Learning concepts, seeking explanations, asking "what/why"
- create: Writing, producing content, drafting, composing
- solve: Working through problems, calculating, debugging, fixing
- evaluate: Assessing options, comparing, deciding, judging
- organize: Planning, scheduling, structuring, prioritizing
- regulate: Reflecting, adjusting learning, managing emotions
- explore: Researching, discovering, browsing, investigating
- interact: Navigating system, communicating, asking for help

Note: Some requests naturally combine intents (e.g., "How do I write a lab report" combines understand + create)

ENGAGEMENT DEPTHS:
- surface: Quick facts, definitions, brief answers for simple, single-step questions with objective solutions (< 2 min engagement)
- guided: Step-by-step help, structured support for more complex topics including subjective questions (5-15 min engagement)
- deep: Thorough exploration, philosophical discussion of the most difficult questions (both subjective and objective) (15+ min engagement)

Analyze the message and determine:
1. Primary learning intent (the main goal)
2. Secondary intent if applicable (e.g., "how to write" = understand primary, create secondary)
3. Engagement depth based on:
   - Question complexity
   - Whether it's objective (factual) or subjective (opinion/decision)
   - User's apparent time investment
   - Level of detail requested
4. Confidence level (0-1)
5. Brief reasoning

Return JSON with this structure:
{
  "primaryIntent": "understand|create|solve|evaluate|organize|regulate|explore|interact",
  "secondaryIntent": "optional - include if request combines multiple intents",
  "depth": "surface|guided|deep",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "needsClarification": false
}`;
        const contextStr = context.conversationHistory?.slice(-2)
            .map(m => `${m.role}: ${m.content.substring(0, 150)}`)
            .join('\n') || '';
        try {
            // Set a reasonable timeout - 60 seconds should be plenty for intent analysis
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);
            const { text } = await (0, ai_1.generateText)({
                model,
                system: systemPrompt,
                prompt: `Previous context:\n${contextStr}\n\nCurrent message: "${context.message}"\n\nAnalyze intent:`,
                temperature: 0.3,
                maxRetries: 2,
                abortSignal: controller.signal
            });
            clearTimeout(timeoutId);
            // Clean up JSON if wrapped in markdown code blocks
            let cleanText = text.trim();
            if (cleanText.startsWith('```json')) {
                cleanText = cleanText.slice(7);
            }
            if (cleanText.startsWith('```')) {
                cleanText = cleanText.slice(3);
            }
            if (cleanText.endsWith('```')) {
                cleanText = cleanText.slice(0, -3);
            }
            const analysis = JSON.parse(cleanText.trim());
            // Ensure all required fields
            return {
                primaryIntent: analysis.primaryIntent || 'understand',
                secondaryIntent: analysis.secondaryIntent,
                depth: analysis.depth || 'surface',
                confidence: analysis.confidence || 0.5,
                reasoning: analysis.reasoning || 'Unable to determine clear intent',
                needsClarification: analysis.needsClarification || false,
                selectedTools: []
            };
        }
        catch (e) {
            console.error('[IntentRouter] Failed to analyze intent:', e);
            // Return safe defaults if LLM fails - no regex fallback
            return {
                primaryIntent: 'understand',
                depth: 'surface',
                confidence: 0.3,
                reasoning: 'LLM analysis failed - using safe defaults',
                needsClarification: true,
                selectedTools: []
            };
        }
    }
    routeToTools(intent) {
        const tools = [];
        // Get primary tool from matrix
        const primaryTool = this.toolMatrix[intent.primaryIntent]?.[intent.depth];
        if (primaryTool) {
            tools.push(primaryTool);
        }
        // Add secondary tool if relevant and different
        if (intent.secondaryIntent) {
            const secondaryTool = this.toolMatrix[intent.secondaryIntent]?.[intent.depth];
            if (secondaryTool && !tools.includes(secondaryTool)) {
                tools.push(secondaryTool);
            }
        }
        // For multi-intent scenarios, consider which tool can handle both
        // e.g., "How do I write a lab report" -> practical_guide can handle both understand + create
        if (intent.primaryIntent === 'understand' && intent.secondaryIntent === 'create') {
            // Practical guide is perfect for "how to" + creation tasks
            return ['practical_guide'];
        }
        else if (intent.primaryIntent === 'create' && intent.secondaryIntent === 'understand') {
            // Writing coach with instructional support
            return ['writing_coach', 'practical_guide'];
        }
        // Ensure we always have at least one tool
        if (tools.length === 0) {
            tools.push('socratic_tool');
        }
        return tools;
    }
    getDefaultTool(intent) {
        const tool = this.toolMatrix[intent.primaryIntent]?.[intent.depth] || 'socratic_tool';
        return this.fallbackTools[tool] || tool;
    }
    generateClarificationPrompt(intent) {
        const depthOptions = {
            surface: 'a quick answer',
            guided: 'step-by-step guidance',
            deep: 'an in-depth exploration'
        };
        const intentDescriptions = {
            understand: 'understand a concept',
            create: 'create or write something',
            solve: 'solve a problem',
            evaluate: 'evaluate options or make a decision',
            organize: 'organize or plan your work',
            regulate: 'reflect on your learning',
            explore: 'explore a topic',
            interact: 'get help with the system'
        };
        return `I think you want to ${intentDescriptions[intent.primaryIntent]} with ${depthOptions[intent.depth]}. Is that right? Or would you prefer a different approach?`;
    }
    // Check if tools are available (for multi-tool orchestration)
    areToolsAvailable(tools) {
        return tools.every(tool => {
            // Check if it's a real tool or needs fallback
            if (this.fallbackTools[tool]) {
                console.log(`[IntentRouter] Tool ${tool} not yet implemented, using fallback`);
                return true; // Fallback available
            }
            // In production, check if tool actually exists
            return true;
        });
    }
}
exports.IntentRouterTool = IntentRouterTool;
// Export singleton instance
exports.intentRouter = new IntentRouterTool();
