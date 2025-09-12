"use strict";
/**
 * Meta-tools for handling frustration, tool switching, and expectation management
 * Uses AI-powered detection to reduce keyword dependency
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.metaTools = exports.feedbackCollector = exports.expectationClarifier = exports.toolSwitchHandler = exports.frustrationHandler = void 0;
exports.analyzeStudentSentiment = analyzeStudentSentiment;
exports.analyzeEngagementPattern = analyzeEngagementPattern;
const ai_1 = require("ai");
const model_selection_1 = require("../model-selection");
/**
 * Frustration Handler Tool
 * Detects and responds to student frustration with empathy and alternatives
 */
exports.frustrationHandler = {
    name: 'frustration_handler',
    description: 'Handles student frustration and offers alternative approaches',
    async execute(params) {
        const { model } = model_selection_1.modelSelection.selectModel({
            tool: 'frustration_handler',
            requiresCreativity: true
        });
        const systemPrompt = `You are Ellen, an empathetic AI tutor. A student is expressing frustration.

Your goals:
1. Acknowledge their feelings without being patronizing
2. Identify what's not working for them
3. Offer concrete alternatives
4. Give them control over how to proceed

Available approaches you can suggest:
- Different explanation style (visual, verbal, mathematical, conceptual)
- Different tool (practice problems, step-by-step walkthrough, real examples)
- Different pace (slower, more detail, or jump to key points)
- Take a break and return later
- Switch to a related but different topic

Be concise, warm, and solution-focused.`;
        const { text } = await (0, ai_1.generateText)({
            model,
            system: systemPrompt,
            prompt: `Student message: ${params.message}
Previous approaches tried: ${params.previousAttempts?.join(', ') || 'none'}
Current tool: ${params.currentTool || 'socratic_tool'}

Respond with empathy and offer 2-3 specific alternatives:`,
            temperature: 0.7
        });
        return {
            content: text || "I hear that this approach isn't working for you. Would you prefer I try explaining this differently, switch to practice problems, or take a step back to review fundamentals?",
            metadata: {
                toolSwitchSuggested: true,
                frustrationDetected: true
            }
        };
    }
};
/**
 * Tool Switch Handler
 * Allows explicit tool switching based on student request
 */
exports.toolSwitchHandler = {
    name: 'tool_switch',
    description: 'Handles explicit requests to change approach or tool',
    async execute(params) {
        const { model } = model_selection_1.modelSelection.selectModel({
            tool: 'tool_switch',
            requiresReasoning: true
        });
        const systemPrompt = `Analyze the student's request to change approach and recommend the best tool.

Available tools and their purposes:
- socratic_tool: Guided questioning to build understanding
- explanation_tool: Direct, clear explanations
- retrieval: Practice problems and quizzes
- worked_example: Step-by-step problem solving
- visual_tool: Diagrams and visual representations
- analogy_tool: Comparisons and metaphors
- writing_coach: Essay and writing help
- note_assistant: Note-taking strategies
- plan_manager: Study planning
- reflection_tool: Self-assessment and metacognition

Return a JSON object with:
{
  "recommended_tool": "tool_name",
  "reason": "brief explanation",
  "transition_message": "message to student"
}`;
        const { text } = await (0, ai_1.generateText)({
            model,
            system: systemPrompt,
            prompt: `Student request: ${params.message}
Current tool: ${params.currentTool}

Recommend the best tool switch:`,
            temperature: 0.3
        });
        try {
            const recommendation = JSON.parse(text || '{}');
            return {
                content: recommendation.transition_message || "Let me try a different approach that might work better for you.",
                metadata: {
                    switchTo: recommendation.recommended_tool,
                    reason: recommendation.reason
                }
            };
        }
        catch {
            return {
                content: "I'll try a different approach. Let me know if this works better for you.",
                metadata: {
                    switchTo: 'explanation_tool'
                }
            };
        }
    }
};
/**
 * Expectation Clarifier Tool
 * Helps clarify what the student needs and what Ellen can provide
 */
exports.expectationClarifier = {
    name: 'expectation_clarifier',
    description: 'Clarifies student expectations and Ellen capabilities',
    async execute(params) {
        const { model } = model_selection_1.modelSelection.selectModel({
            tool: 'expectation_clarifier'
        });
        const systemPrompt = `You are Ellen. A student seems unclear about what kind of help they need or what you can provide.

Your capabilities:
- Explain concepts through questioning (Socratic method)
- Provide direct explanations
- Create practice problems
- Work through examples step-by-step
- Help with writing and essays
- Create study plans
- Assist with note-taking
- Help reflect on learning

Your limitations:
- Cannot do homework for them
- Cannot access external websites or current events
- Cannot provide medical/legal/financial advice
- Cannot replace human teachers for grading

Be clear, helpful, and guide them toward productive learning activities.`;
        const { text } = await (0, ai_1.generateText)({
            model,
            system: systemPrompt,
            prompt: `Student message: ${params.message}

Help clarify what they need and what you can offer:`,
            temperature: 0.6
        });
        return {
            content: text || "I can help you learn in several ways. Would you like me to explain concepts, work through problems together, help you practice, or assist with planning your studies?",
            metadata: {
                clarificationType: 'capabilities'
            }
        };
    }
};
/**
 * Feedback Collector Tool
 * Collects feedback when things aren't working
 */
exports.feedbackCollector = {
    name: 'feedback_collector',
    description: 'Collects feedback about what is not working',
    async execute(params) {
        const questions = [
            "What specifically isn't working for you right now?",
            "How would you prefer I explain this?",
            "What would be most helpful for your learning?",
            "Is the pace too fast, too slow, or just not the right approach?"
        ];
        // Store feedback for improvement
        const feedback = {
            sessionId: params.sessionId,
            message: params.message,
            timestamp: new Date().toISOString(),
            type: 'frustration_feedback'
        };
        // In production, this would save to database
        console.log('Feedback collected:', feedback);
        return {
            content: "I want to help you better. " + questions[0],
            metadata: {
                feedbackRequested: true,
                followUpQuestions: questions.slice(1)
            }
        };
    }
};
/**
 * AI-powered sentiment analysis for frustration and intent detection
 */
async function analyzeStudentSentiment(message, conversationHistory) {
    // First, do a quick keyword check for obvious cases
    const quickCheck = quickFrustrationCheck(message);
    if (quickCheck.isObvious) {
        return quickCheck.result;
    }
    // For ambiguous cases, use AI analysis
    const { model } = model_selection_1.modelSelection.selectModel({
        tool: 'sentiment_analysis' // Tool config will determine the tier
    });
    const systemPrompt = `Analyze the student's message for learning sentiment and needs.

Consider:
- Frustration indicators (direct and subtle)
- Confusion signals
- Engagement level
- Learning style mismatches
- Implicit requests for different approaches

Look for subtle cues like:
- Short, terse responses
- Polite but disengaged language
- Repeated similar questions
- Indirect expressions of difficulty
- Changes in communication pattern

Return a JSON object with:
{
  "frustrationLevel": 0-10 (0=none, 10=very frustrated),
  "needsToolSwitch": boolean,
  "suggestedTool": "tool_name or null",
  "sentimentType": "positive|neutral|confused|frustrated|disengaged",
  "confidence": 0-1,
  "reasoning": "brief explanation"
}`;
    const contextStr = conversationHistory
        ? `Recent conversation:\n${conversationHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}\n\n`
        : '';
    const { text } = await (0, ai_1.generateText)({
        model,
        system: systemPrompt,
        prompt: `${contextStr}Current message: ${message}\n\nAnalyze the student's state:`,
        temperature: 0.3
    });
    try {
        const analysis = JSON.parse(text || '{}');
        return {
            frustrationLevel: analysis.frustrationLevel || 0,
            needsToolSwitch: analysis.needsToolSwitch || false,
            suggestedTool: analysis.suggestedTool,
            sentimentType: analysis.sentimentType || 'neutral',
            confidence: analysis.confidence || 0.5
        };
    }
    catch {
        // Fallback to keyword-based detection
        return {
            frustrationLevel: detectFrustrationKeywords(message) ? 5 : 0,
            needsToolSwitch: detectToolSwitchKeywords(message),
            sentimentType: 'neutral',
            confidence: 0.3
        };
    }
}
/**
 * Quick keyword check for obvious frustration
 */
function quickFrustrationCheck(message) {
    const lowerMessage = message.toLowerCase();
    // Very clear frustration
    if (/hate this|give up|waste of time|this sucks/i.test(message)) {
        return {
            isObvious: true,
            result: {
                frustrationLevel: 8,
                needsToolSwitch: true,
                sentimentType: 'frustrated',
                confidence: 0.9
            }
        };
    }
    // Clear confusion
    if (/completely lost|no idea|don't understand anything/i.test(message)) {
        return {
            isObvious: true,
            result: {
                frustrationLevel: 6,
                needsToolSwitch: true,
                sentimentType: 'confused',
                confidence: 0.85
            }
        };
    }
    // Clear tool switch request
    if (/just tell me the answer|stop asking questions|show me how/i.test(message)) {
        return {
            isObvious: true,
            result: {
                frustrationLevel: 4,
                needsToolSwitch: true,
                suggestedTool: 'explanation_tool',
                sentimentType: 'frustrated',
                confidence: 0.8
            }
        };
    }
    return { isObvious: false, result: null };
}
/**
 * Fallback keyword-based frustration detection
 */
function detectFrustrationKeywords(message) {
    const frustrationIndicators = [
        /not (working|helping|useful)/i,
        /don'?t (understand|get it)/i,
        /confused/i,
        /frustrat/i,
        /this is (hard|difficult|impossible)/i,
        /can'?t do this/i,
        /that'?s not what i (asked|wanted|meant)/i,
        /you'?re not (helping|understanding)/i
    ];
    return frustrationIndicators.some(pattern => pattern.test(message));
}
/**
 * Fallback keyword-based tool switch detection
 */
function detectToolSwitchKeywords(message) {
    const switchIndicators = [
        /can you (just )?(explain|show|tell)/i,
        /give me (practice|problems|examples)/i,
        /different approach/i,
        /instead of/i,
        /stop (asking|questioning)/i,
        /just (answer|help)/i
    ];
    return switchIndicators.some(pattern => pattern.test(message));
}
/**
 * Analyze conversation patterns for disengagement
 */
async function analyzeEngagementPattern(messages) {
    // Look at recent message patterns
    const recentStudentMessages = messages
        .filter(m => m.role === 'user')
        .slice(-5);
    if (recentStudentMessages.length < 2) {
        return {
            isDisengaging: false,
            pattern: 'active',
            recommendation: 'continue'
        };
    }
    // Check for declining engagement
    const messageLengths = recentStudentMessages.map(m => m.content.length);
    const avgEarlyLength = messageLengths.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
    const avgRecentLength = messageLengths.slice(-2).reduce((a, b) => a + b, 0) / 2;
    // Short responses indicate disengagement
    const veryShortResponses = recentStudentMessages.filter(m => m.content.length < 10).length;
    if (avgRecentLength < avgEarlyLength * 0.3 || veryShortResponses >= 3) {
        return {
            isDisengaging: true,
            pattern: 'declining',
            recommendation: 'switch_approach'
        };
    }
    // Check for frustration patterns (repeated similar questions)
    const lastThree = recentStudentMessages.slice(-3).map(m => m.content.toLowerCase());
    const hasRepetition = lastThree.some((msg, i) => lastThree.slice(i + 1).some(other => similarityScore(msg, other) > 0.7));
    if (hasRepetition) {
        return {
            isDisengaging: true,
            pattern: 'frustrated',
            recommendation: 'clarify_and_switch'
        };
    }
    return {
        isDisengaging: false,
        pattern: 'active',
        recommendation: 'continue'
    };
}
/**
 * Simple similarity score between two strings
 */
function similarityScore(str1, str2) {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
}
// Export all meta tools
exports.metaTools = {
    frustrationHandler: exports.frustrationHandler,
    toolSwitchHandler: exports.toolSwitchHandler,
    expectationClarifier: exports.expectationClarifier,
    feedbackCollector: exports.feedbackCollector
};
