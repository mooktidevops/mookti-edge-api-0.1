"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.practicalGuideTool = exports.PracticalGuideTool = void 0;
const ai_1 = require("ai");
const model_selection_1 = require("../model-selection");
/**
 * Practical Guide Tool
 *
 * Purpose: Provide actionable, step-by-step guidance for academic tasks
 * Use cases:
 * - "How do I write a thesis statement?"
 * - "Steps to solve a differential equation"
 * - "How to prepare for my chemistry lab"
 * - "How do I cite sources in APA format?"
 *
 * Key difference from Socratic: Direct instruction, not discovery learning
 */
class PracticalGuideTool {
    name = 'practical_guide';
    description = 'Provides step-by-step practical guidance for academic tasks';
    async execute(params) {
        const { message, retrievalContent, context, currentCourse } = params;
        // Use balanced model for structured guidance
        const { model } = model_selection_1.modelSelection.selectModel({
            requiresReasoning: true,
            complexity: 2 // Medium complexity for practical guidance
        });
        const systemPrompt = `You are a practical academic guide providing clear, actionable instructions.

INSTRUCTIONS:
1. Provide DIRECT, STEP-BY-STEP guidance
2. Be specific and actionable
3. Include concrete examples when helpful
4. NO Socratic questioning - just tell them HOW
5. Structure response with clear steps or bullet points
6. Include practical tips or common pitfalls if relevant
7. Keep focused on the specific task at hand

STYLE:
- Like a helpful TA showing you exactly what to do
- Clear numbered steps or bullet points
- Practical and immediately applicable
- Include "pro tips" or shortcuts when relevant

${currentCourse ? `COURSE CONTEXT: ${currentCourse}` : ''}
${retrievalContent ? `\nRELEVANT MATERIALS:\n${retrievalContent}` : ''}`;
        try {
            const { text } = await (0, ai_1.generateText)({
                model,
                system: systemPrompt,
                prompt: `Student needs help with: "${message}"\n\nProvide practical, actionable guidance.`,
                temperature: 0.4,
                maxRetries: 2
            });
            // Parse out steps if present (basic parsing)
            const steps = this.extractSteps(text);
            const tips = this.extractTips(text);
            return {
                content: text,
                steps,
                tips
            };
        }
        catch (error) {
            console.error('[PracticalGuide] Generation failed:', error);
            return {
                content: "I'll help you with that task. Could you provide more specific details about what you're trying to accomplish?",
                steps: [],
                tips: []
            };
        }
    }
    extractSteps(text) {
        const steps = [];
        const lines = text.split('\n');
        for (const line of lines) {
            // Look for numbered steps (1. 2. etc) or bullet points
            if (/^\d+\.|^[-•*]/.test(line.trim())) {
                steps.push(line.trim().replace(/^\d+\.|^[-•*]\s*/, ''));
            }
        }
        return steps;
    }
    extractTips(text) {
        const tips = [];
        const lines = text.split('\n');
        for (const line of lines) {
            if (/tip:|note:|important:|pro tip:/i.test(line)) {
                tips.push(line.trim());
            }
        }
        return tips;
    }
}
exports.PracticalGuideTool = PracticalGuideTool;
exports.practicalGuideTool = new PracticalGuideTool();
