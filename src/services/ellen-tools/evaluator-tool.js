"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluatorTool = exports.EvaluatorTool = void 0;
const ai_1 = require("ai");
const model_selection_1 = require("../model-selection");
/**
 * Evaluator Tool
 *
 * Purpose: Help students make informed decisions by evaluating options
 * Use cases:
 * - "Should I drop this class?"
 * - "Which topic should I study first?"
 * - "Is my thesis statement strong enough?"
 * - "Should I take organic chemistry or biochemistry?"
 *
 * Key approach: Structured decision-making frameworks
 */
class EvaluatorTool {
    name = 'evaluator_tool';
    description = 'Helps evaluate options and make informed academic decisions';
    async execute(params) {
        const { message, options, criteria, context, decisionType } = params;
        // Use reasoning model for evaluation
        const { model } = model_selection_1.modelSelection.selectModel({
            requiresReasoning: true,
            complexity: 3 // High complexity for thorough evaluation
        });
        const systemPrompt = `You are a decision-making assistant helping students evaluate their options thoughtfully.

APPROACH:
1. Clarify the decision to be made
2. Identify key criteria for evaluation
3. Analyze each option against the criteria
4. Provide a balanced assessment
5. Make a recommendation (if appropriate)
6. Suggest next steps

INSTRUCTIONS:
- Be objective and balanced
- Consider both short-term and long-term impacts
- Help students think through consequences
- Don't make the decision FOR them (unless asked directly)
- Present information to empower their decision
- Consider academic, personal, and practical factors

FORMAT:
**Decision Context**
[What's being decided and why it matters]

**Key Criteria**
• [Criterion 1]: [Why it matters]
• [Criterion 2]: [Why it matters]

**Analysis**
Option 1: [Name]
Pros:
- [Advantage 1]
- [Advantage 2]
Cons:
- [Disadvantage 1]
- [Disadvantage 2]

Option 2: [Name]
[Similar structure]

**Recommendation**
[If appropriate, suggest best option with reasoning]

**Next Steps**
1. [Concrete action]
2. [Another action]

${decisionType ? `\nDECISION TYPE: ${decisionType}` : ''}
${options ? `\nOPTIONS TO CONSIDER: ${options.join(', ')}` : ''}
${criteria ? `\nIMPORTANT CRITERIA: ${criteria.join(', ')}` : ''}`;
        try {
            const { text } = await (0, ai_1.generateText)({
                model,
                system: systemPrompt,
                prompt: `Student's decision: "${message}"\n\nHelp them evaluate their options systematically.`,
                temperature: 0.4,
                maxRetries: 2
            });
            // Parse the structured response
            const parsed = this.parseEvaluation(text);
            return {
                content: text,
                recommendation: parsed.recommendation,
                analysis: parsed.analysis,
                criteria: parsed.criteria,
                nextSteps: parsed.nextSteps
            };
        }
        catch (error) {
            console.error('[Evaluator] Generation failed:', error);
            return {
                content: "Let's work through this decision together. Could you tell me more about your options and what factors are most important to you?",
                analysis: [],
                nextSteps: []
            };
        }
    }
    parseEvaluation(text) {
        const lines = text.split('\n');
        const analysis = [];
        const criteria = [];
        const nextSteps = [];
        let recommendation;
        let currentSection = '';
        let currentOption = null;
        for (const line of lines) {
            // Detect sections
            if (/^\*\*.*Recommendation/i.test(line)) {
                currentSection = 'recommendation';
                continue;
            }
            else if (/^\*\*.*Criteria/i.test(line)) {
                currentSection = 'criteria';
                continue;
            }
            else if (/^\*\*.*Analysis/i.test(line)) {
                currentSection = 'analysis';
                continue;
            }
            else if (/^\*\*.*Next Steps/i.test(line)) {
                currentSection = 'nextSteps';
                continue;
            }
            else if (/^Option \d+:|^Choice \d+:/i.test(line)) {
                if (currentOption) {
                    analysis.push(currentOption);
                }
                currentOption = {
                    option: line.replace(/^(Option|Choice) \d+:\s*/i, ''),
                    pros: [],
                    cons: []
                };
                continue;
            }
            // Process content based on section
            if (currentSection === 'recommendation' && line.trim()) {
                recommendation = (recommendation || '') + ' ' + line.trim();
            }
            else if (currentSection === 'criteria' && line.trim().startsWith('•')) {
                const [criterion, explanation] = line.replace('•', '').split(':');
                if (criterion) {
                    criteria.push({
                        criterion: criterion.trim(),
                        importance: 'medium',
                        explanation: explanation?.trim() || ''
                    });
                }
            }
            else if (currentSection === 'nextSteps' && /^\d+\.|^[-•]/.test(line.trim())) {
                nextSteps.push(line.trim().replace(/^\d+\.|^[-•]\s*/, ''));
            }
            else if (currentOption) {
                if (/^Pros:/i.test(line)) {
                    currentSection = 'pros';
                }
                else if (/^Cons:/i.test(line)) {
                    currentSection = 'cons';
                }
                else if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                    const item = line.trim().replace(/^[-•]\s*/, '');
                    if (currentSection === 'pros') {
                        currentOption.pros.push(item);
                    }
                    else if (currentSection === 'cons') {
                        currentOption.cons.push(item);
                    }
                }
            }
        }
        // Don't forget the last option
        if (currentOption) {
            analysis.push(currentOption);
        }
        return {
            recommendation: recommendation?.trim(),
            analysis,
            criteria,
            nextSteps
        };
    }
}
exports.EvaluatorTool = EvaluatorTool;
exports.evaluatorTool = new EvaluatorTool();
