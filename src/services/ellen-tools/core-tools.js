"use strict";
/**
 * Ellen's Core Pedagogical Tools Implementation
 *
 * These tools embody research-backed pedagogical principles
 * and integrate with the Ellen orchestrator for seamless learning support.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EllenToolOrchestrator = exports.GenealogyTool = exports.ExtensionTool = exports.ReflectionTool = exports.SocraticTool = void 0;
const ai_1 = require("ai");
const research_foundations_1 = require("./research-foundations");
/**
 * Socratic Tool - Implements elenchus through productive confusion
 */
class SocraticTool {
    foundation = research_foundations_1.ResearchFoundations.socratic;
    async execute(context) {
        const systemPrompt = this.buildSystemPrompt(context);
        const { text } = await (0, ai_1.generateText)({
            model: context.modelRouting.model,
            system: systemPrompt,
            prompt: this.buildUserPrompt(context),
            temperature: 0.7
        });
        return {
            content: text,
            metadata: {
                toolName: 'socratic_elenchus',
                researchBasis: [
                    this.foundation.research.productiveConfusion.citation,
                    this.foundation.research.assistanceDilemma.citation
                ],
                cognitiveLoad: this.assessCognitiveLoad(text),
                emotionalSupport: this.generateEmotionalSupport(context)
            }
        };
    }
    buildSystemPrompt(context) {
        const hasEmotionalSignals = context.emotionalSignals && context.emotionalSignals.length > 0;
        const emotionalGuidance = hasEmotionalSignals
            ? `\nEMOTIONAL AWARENESS: User shows ${context.emotionalSignals?.join(', ')}. Be especially ${context.emotionalSignals?.includes('frustrated') ? 'encouraging and break down complexity' :
                context.emotionalSignals?.includes('confused') ? 'clear and structured' :
                    'supportive and validating'}.`
            : '';
        return `You are Ellen, implementing the Socratic method through elenchus (systematic questioning).

CORE PRINCIPLE - ELENCHUS:
The Socratic method is NOT about withholding answers or being cryptic. It's about:
1. ANSWERING FIRST when questions are specific (2-3 sentences)
2. Then asking ONE carefully crafted follow-up question
3. Creating moments of productive confusion (aporia) that motivate deeper understanding

RESEARCH BASIS (${this.foundation.research.productiveConfusion.citation}):
- Confusion-resolution cycles enhance learning when properly scaffolded
- Aporia should feel like "productive struggle" not frustration
- Questions should expose inconsistencies gently, never harshly

STRUCTURE YOUR RESPONSE:
1. DIRECT ANSWER: If the question is specific, provide a clear 2-3 sentence answer
2. CONCEPTUAL BRIDGE: Connect to deeper principle or pattern (1 sentence)
3. FOCUS QUESTION: ONE question targeting the core concept
4. OPTIONAL EXTENSION: Only if naturally flowing, add ONE "What if..." or "How might..." question

APORIA CREATION:
- Use apparent contradictions: "You said X, but also Y. How do these coexist?"
- Surface assumptions: "That assumes Z. What if Z weren't true?"
- Shift perspective: "From another angle, this looks different. What do you see?"

${emotionalGuidance}

NEVER:
- Ask more than 2 questions total
- Use harsh language or judgment
- Create confusion without scaffolding
- Withhold direct answers to specific questions`;
    }
    buildUserPrompt(context) {
        let prompt = `User says: "${context.userMessage}"`;
        if (context.currentTopic) {
            prompt += `\nCurrent topic: ${context.currentTopic}`;
        }
        if (context.retrievalContext) {
            prompt += `\n\nRelevant information:\n${context.retrievalContext}`;
        }
        prompt += `\n\nGenerate a Socratic response following the elenchus method. Remember: answer first if specific, then guide toward productive aporia.`;
        return prompt;
    }
    assessCognitiveLoad(response) {
        const questionCount = (response.match(/\?/g) || []).length;
        const conceptCount = (response.match(/\b(principle|concept|idea|theory|framework)\b/gi) || []).length;
        if (questionCount > 2 || conceptCount > 3)
            return 'high';
        if (questionCount > 1 || conceptCount > 1)
            return 'medium';
        return 'low';
    }
    generateEmotionalSupport(context) {
        if (!context.emotionalSignals || context.emotionalSignals.length === 0)
            return undefined;
        if (context.emotionalSignals.includes('frustrated')) {
            return "I can see this is challenging. Let's break it down into smaller pieces.";
        }
        if (context.emotionalSignals.includes('confused')) {
            return "This confusion is actually valuable - it means you're grappling with something important.";
        }
        if (context.emotionalSignals.includes('excited')) {
            return "Your enthusiasm is wonderful! Let's channel it into deeper exploration.";
        }
        return "You're doing great. This kind of thinking takes effort.";
    }
}
exports.SocraticTool = SocraticTool;
/**
 * Reflection Tool - Metacognitive awareness and self-regulated learning
 */
class ReflectionTool {
    foundation = research_foundations_1.ResearchFoundations.reflection;
    async execute(context) {
        const systemPrompt = `You are Ellen, guiding metacognitive reflection based on self-regulated learning research.

RESEARCH BASIS (${this.foundation.research.selfRegulation.citation}):
Effective reflection follows three phases:
1. FORETHOUGHT: What was I trying to learn?
2. PERFORMANCE: How did my learning go?
3. SELF-REFLECTION: What would I do differently?

STRUCTURE YOUR REFLECTION PROMPT:
1. ACKNOWLEDGE: Validate what the learner has accomplished (1 sentence)
2. METACOGNITIVE QUESTION: Ask about their thinking process, not just content
3. EMOTIONAL CHECK: "How are you feeling about this learning?"
4. STRATEGY PROBE: "What approach worked best for you?"
5. FORWARD LOOK: "What would you like to clarify or explore next?"

CALIBRATION FOCUS (${this.foundation.research.metacognition.citation}):
- Help learners accurately assess their understanding
- "Rate your confidence 1-10, then explain why"
- "What parts feel solid vs shaky?"

AVOID:
- Generic prompts like "What did you learn?"
- Focus on grades or performance metrics
- Rushing to next topic without consolidation`;
        const { text } = await (0, ai_1.generateText)({
            model: context.modelRouting.model,
            system: systemPrompt,
            prompt: `User says: "${context.userMessage}"\n\nGuide them through evidence-based metacognitive reflection.`,
            temperature: 0.6
        });
        return {
            content: text,
            metadata: {
                toolName: 'reflection_tool',
                researchBasis: [
                    this.foundation.research.selfRegulation.citation,
                    this.foundation.research.metacognition.citation
                ],
                cognitiveLoad: 'low' // Reflection should be low cognitive load
            }
        };
    }
}
exports.ReflectionTool = ReflectionTool;
/**
 * Extension Tool - Connecting to broader contexts and applications
 */
class ExtensionTool {
    foundation = research_foundations_1.ResearchFoundations.extension;
    async execute(context) {
        const systemPrompt = `You are Ellen, helping learners extend knowledge to new domains and applications.

RESEARCH BASIS (${this.foundation.research.transferLearning.citation}):
Preparation for Future Learning (PFL) is more valuable than direct application.

EXTENSION TYPES (choose most appropriate):
1. ANALOGICAL: "This is like [familiar concept] because..."
2. APPLICATION: "In the real world, this shows up when..."
3. CROSS-DOMAIN: "In [other field], they use this principle for..."
4. HYPOTHETICAL: "If we changed X, then Y would..."
5. CREATIVE: "You could combine this with [other idea] to..."

STRUCTURE (${this.foundation.research.analogicalReasoning.citation}):
1. BRIDGE: Connect current learning to new domain (1-2 sentences)
2. STRUCTURAL MAPPING: Show how relationships transfer
3. DIFFERENCES: Acknowledge where analogy breaks down
4. EXPLORATION PROMPT: "How might this apply to [learner's interest]?"

COGNITIVE HIERARCHY (${this.foundation.research.cognitiveHierarchy.citation}):
Move progressively through:
- UNDERSTAND: Basic comprehension
- APPLY: Use in new situation
- ANALYZE: Break down relationships
- EVALUATE: Make judgments
- CREATE: Generate novel combinations`;
        const { text } = await (0, ai_1.generateText)({
            model: context.modelRouting.model,
            system: systemPrompt,
            prompt: this.buildExtensionPrompt(context),
            temperature: 0.8 // Higher temperature for creative connections
        });
        return {
            content: text,
            metadata: {
                toolName: 'extension_tool',
                researchBasis: [
                    this.foundation.research.transferLearning.citation,
                    this.foundation.research.situatedCognition.citation
                ],
                cognitiveLoad: 'medium'
            }
        };
    }
    buildExtensionPrompt(context) {
        let prompt = `User says: "${context.userMessage}"`;
        if (context.currentTopic) {
            prompt += `\nCurrent topic: ${context.currentTopic}`;
        }
        if (context.learningGoal) {
            prompt += `\nTheir learning goal: ${context.learningGoal}`;
        }
        prompt += `\n\nCreate a knowledge extension that connects this to broader contexts. Choose the most appropriate extension type.`;
        return prompt;
    }
}
exports.ExtensionTool = ExtensionTool;
/**
 * Genealogy Tool - Tracing conceptual evolution and historical development
 */
class GenealogyTool {
    foundation = research_foundations_1.ResearchFoundations.genealogy;
    async execute(context) {
        const systemPrompt = `You are Ellen, tracing the genealogy of ideas to deepen understanding.

RESEARCH BASIS (${this.foundation.research.conceptMapping.citation}):
Hierarchical organization with cross-links enhances comprehension.

GENEALOGY STRUCTURE:
1. ORIGINS: Where did this idea come from? (1-2 sentences)
2. KEY EVOLUTION: Major shifts or developments (2-3 points)
3. CONTROVERSIES: Disagreements or paradigm shifts
4. MODERN FORM: How we understand it today
5. FUTURE DIRECTIONS: Where it's heading

PARADIGM AWARENESS (${this.foundation.research.paradigmShifts.citation}):
- Highlight when understanding fundamentally shifted
- "Before [year], people thought X. Then [discovery] showed Y."
- Show how "wrong" ideas were logical given available evidence

MISCONCEPTION PATTERNS (${this.foundation.research.conceptualChange.citation}):
- Common misconceptions often mirror historical mistakes
- "Like early scientists, many people initially think..."
- Use history to normalize and address confusion

CULTURAL CONTEXT (${this.foundation.research.historicalCultural.citation}):
- Ideas develop within cultural and technological constraints
- "This only became possible when..."
- "In [culture/time], they understood this as..."`;
        const { text } = await (0, ai_1.generateText)({
            model: context.modelRouting.model,
            system: systemPrompt,
            prompt: `User asks about: "${context.userMessage}"\n\nTrace the genealogy of this concept, showing its evolution and key transitions.`,
            temperature: 0.7
        });
        return {
            content: text,
            metadata: {
                toolName: 'genealogy_tool',
                researchBasis: [
                    this.foundation.research.conceptMapping.citation,
                    this.foundation.research.paradigmShifts.citation
                ],
                cognitiveLoad: 'high' // Historical context adds complexity
            }
        };
    }
}
exports.GenealogyTool = GenealogyTool;
/**
 * Tool Orchestrator - Intelligently selects and chains tools
 */
class EllenToolOrchestrator {
    socraticTool = new SocraticTool();
    reflectionTool = new ReflectionTool();
    extensionTool = new ExtensionTool();
    genealogyTool = new GenealogyTool();
    async selectAndExecute(context, toolName) {
        // If specific tool requested, use it
        if (toolName) {
            return this.executeTool(toolName, context);
        }
        // Otherwise, intelligently select based on context
        const selectedTool = this.selectBestTool(context);
        return this.executeTool(selectedTool, context);
    }
    selectBestTool(context) {
        const message = context.userMessage.toLowerCase();
        // Reflection indicators
        if (message.includes('understand') || message.includes('confused') ||
            message.includes('struggling') || message.includes('difficult')) {
            return 'reflection';
        }
        // Extension indicators
        if (message.includes('apply') || message.includes('use this') ||
            message.includes('real world') || message.includes('connect')) {
            return 'extension';
        }
        // Genealogy indicators
        if (message.includes('history') || message.includes('came from') ||
            message.includes('evolved') || message.includes('discovered')) {
            return 'genealogy';
        }
        // Default to Socratic for general learning
        return 'socratic';
    }
    async executeTool(toolName, context) {
        switch (toolName) {
            case 'socratic':
                return this.socraticTool.execute(context);
            case 'reflection':
                return this.reflectionTool.execute(context);
            case 'extension':
                return this.extensionTool.execute(context);
            case 'genealogy':
                return this.genealogyTool.execute(context);
            default:
                // Fallback to Socratic
                return this.socraticTool.execute(context);
        }
    }
    /**
     * Assesses whether cognitive load is appropriate for the learner
     */
    assessCognitiveLoadBalance(responses) {
        const loads = responses
            .map(r => r.metadata?.cognitiveLoad)
            .filter(Boolean);
        if (loads.length === 0) {
            return { average: 'medium', recommendation: 'No load data available' };
        }
        const loadValues = loads.map(l => l === 'low' ? 1 : l === 'medium' ? 2 : 3);
        const average = loadValues.reduce((a, b) => a + b, 0) / loadValues.length;
        let avgLoad;
        let recommendation;
        if (average < 1.5) {
            avgLoad = 'low';
            recommendation = 'Can increase complexity - learner has capacity';
        }
        else if (average < 2.5) {
            avgLoad = 'medium';
            recommendation = 'Good balance - maintain current level';
        }
        else {
            avgLoad = 'high';
            recommendation = 'Consider simplifying - approaching overload';
        }
        return { average: avgLoad, recommendation };
    }
}
exports.EllenToolOrchestrator = EllenToolOrchestrator;
