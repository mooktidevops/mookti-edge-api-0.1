"use strict";
/**
 * Specific Strategy Implementation Tools
 *
 * Concrete implementations of evidence-based learning strategies
 * with step-by-step guidance and progress tracking.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategyImplementationOrchestrator = exports.DesirableDifficultiesPracticeTool = exports.DualCodingTool = exports.SelfExplanationTool = exports.RetrievalPracticeTool = exports.ClassTroubleshooterTool = void 0;
const ai_1 = require("ai");
/**
 * Class Troubleshooter - Diagnose and fix specific class problems
 */
class ClassTroubleshooterTool {
    async execute(context) {
        const systemPrompt = `You are Ellen, diagnosing and solving specific classroom learning problems.

COMMON CLASS PROBLEMS & TARGETED SOLUTIONS:

1. "LECTURE TOO FAST"
   Research: Mayer (2008) - Cognitive Theory of Multimedia Learning
   Solutions:
   - Pre-read before class (scaffolding)
   - Focus on structure not details
   - Record audio if permitted
   - Cornell notes with cue column
   Implementation: [Specific steps]

2. "CAN'T UNDERSTAND PROFESSOR"
   Research: Ambrose et al. (2010) - How Learning Works
   Solutions:
   - Identify knowledge gaps
   - Create glossary of terms
   - Form study group for translation
   - Use multiple resources
   Implementation: [Specific steps]

3. "BORING/UNMOTIVATED"
   Research: Ryan & Deci (2000) - Self-Determination Theory
   Solutions:
   - Connect to personal goals
   - Gamify with challenges
   - Teach to learn (Feynman)
   - Find real-world applications
   Implementation: [Specific steps]

4. "TOO MUCH READING"
   Research: Simpson & Nist (2000) - Strategic Reading
   Solutions:
   - SQ3R method (Survey, Question, Read, Recite, Review)
   - Prioritize by lecture alignment
   - Speed reading for context, slow for concepts
   - Collaborative dividing
   Implementation: [Specific steps]

5. "MATH/PROBLEM SOLVING CONFUSION"
   Research: Polya (1945) - How to Solve It
   Solutions:
   - Worked examples first
   - Identify problem types
   - Create solution templates
   - Error analysis journal
   Implementation: [Specific steps]

6. "GROUP PROJECT ISSUES"
   Research: Johnson & Johnson (2009) - Cooperative Learning
   Solutions:
   - Clear role definition
   - Regular check-ins
   - Shared document system
   - Peer evaluation forms
   Implementation: [Specific steps]

DIAGNOSTIC PROCESS:
1. Identify specific symptoms
2. Trace to root cause
3. Select targeted intervention
4. Create implementation plan
5. Set success metrics`;
        const userPrompt = `Student problem: "${context.userMessage}"
${context.subject ? `Subject: ${context.subject}` : ''}
${context.difficulty ? `Difficulty level: ${context.difficulty}` : ''}

Diagnose the specific issue and provide targeted solution steps.`;
        const { text } = await (0, ai_1.generateText)({
            model: context.modelRouting.model,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.6
        });
        return this.parseTroubleshooterResponse(text, context);
    }
    parseTroubleshooterResponse(text, context) {
        const steps = [
            {
                step: 1,
                instruction: "Identify the specific problem pattern",
                example: "Lectures move too fast to take complete notes",
                timeEstimate: 2,
                checkpoint: "Can articulate exactly when/where problem occurs"
            },
            {
                step: 2,
                instruction: "Implement immediate coping strategy",
                example: "Focus on main ideas only, fill details later",
                timeEstimate: 0,
                checkpoint: "Have a temporary workaround in place"
            },
            {
                step: 3,
                instruction: "Build long-term solution",
                example: "Pre-read + Cornell notes + review cycle",
                timeEstimate: 30,
                checkpoint: "System is sustainable and effective"
            }
        ];
        return {
            technique: 'Class Troubleshooting',
            steps,
            expectedTime: 35,
            difficultyLevel: 'medium',
            metadata: {
                toolName: 'class_troubleshooter',
                researchBacking: 'Ambrose et al. (2010) - How Learning Works'
            }
        };
    }
}
exports.ClassTroubleshooterTool = ClassTroubleshooterTool;
/**
 * Retrieval Practice Implementation
 */
class RetrievalPracticeTool {
    async execute(context) {
        const systemPrompt = `You are Ellen, implementing retrieval practice strategy.

RESEARCH: Roediger & Butler (2011) - Critical Review
Effect Size: d = 0.90 (very large)

RETRIEVAL PRACTICE FORMATS:

1. FREE RECALL
   - Close all materials
   - Write everything you remember
   - Check against notes
   - Focus on gaps
   Time: 10-15 minutes

2. QUESTION GENERATION
   - Create test questions while studying
   - Mix fact/concept/application levels
   - Answer without looking
   - Self-grade honestly
   Time: 20-30 minutes

3. ELABORATIVE INTERROGATION
   - Ask "why" for each fact
   - Generate explanations
   - Connect to prior knowledge
   - Test explanation accuracy
   Time: 15-20 minutes

4. TEACHING REHEARSAL
   - Explain to imaginary student
   - Anticipate questions
   - Simplify without losing accuracy
   - Record and review
   Time: 20-25 minutes

5. PRACTICE TESTING
   - Use past exams/problem sets
   - Time yourself
   - Grade immediately
   - Analyze errors
   Time: 30-45 minutes

SPACING SCHEDULE:
- Initial test: Same day as learning
- First retrieval: Next day
- Second: 3 days later
- Third: 1 week later
- Monthly thereafter

SUCCESS INDICATORS:
- Can retrieve 80% after delay
- Faster retrieval over time
- Can apply in new contexts
- Confident without notes`;
        const { text } = await (0, ai_1.generateText)({
            model: context.modelRouting.model,
            system: systemPrompt,
            prompt: `Material to practice: "${context.content || context.userMessage}"
Create specific retrieval practice steps.`,
            temperature: 0.7
        });
        return {
            technique: 'Retrieval Practice',
            steps: this.generateRetrievalSteps(context),
            expectedTime: 25,
            difficultyLevel: 'medium',
            metadata: {
                toolName: 'retrieval_practice',
                researchBacking: 'Roediger & Butler (2011)',
                effectSize: 0.90
            }
        };
    }
    generateRetrievalSteps(context) {
        return [
            {
                step: 1,
                instruction: "Brain dump: Write everything you remember without looking",
                example: "Set timer for 10 minutes, write freely about the topic",
                timeEstimate: 10,
                checkpoint: "Filled at least one page with recalled information"
            },
            {
                step: 2,
                instruction: "Check and mark: Compare to notes, mark gaps in red",
                example: "✓ for correct, X for wrong, ? for partially correct",
                timeEstimate: 5,
                checkpoint: "Identified specific knowledge gaps"
            },
            {
                step: 3,
                instruction: "Fill gaps: Study only the missed information",
                example: "Focus on red marks, create memory hooks",
                timeEstimate: 10,
                checkpoint: "Can now recall previously missed items"
            },
            {
                step: 4,
                instruction: "Test again: Retrieve after 10-minute break",
                example: "Do something else, then test again",
                timeEstimate: 5,
                checkpoint: "Improved retrieval score by 20%+"
            }
        ];
    }
}
exports.RetrievalPracticeTool = RetrievalPracticeTool;
/**
 * Self-Explanation Strategy Implementation
 */
class SelfExplanationTool {
    async execute(context) {
        const systemPrompt = `You are Ellen, guiding self-explanation strategy.

RESEARCH: Chi et al. (1994) - Self-Explanations
Effect Size: d = 0.61 (moderate-large)

SELF-EXPLANATION TECHNIQUES:

1. PRINCIPLE IDENTIFICATION
   "This works because..."
   - State underlying principle
   - Connect to theory
   - Explain constraints

2. BRIDGING INFERENCES
   "This connects to... because..."
   - Link current to prior knowledge
   - Fill conceptual gaps
   - Build mental models

3. MONITORING STATEMENTS
   "I understand/don't understand..."
   - Assess comprehension
   - Identify confusion
   - Target re-study

4. PARAPHRASING PLUS
   "In other words... which means..."
   - Restate in own words
   - Add implications
   - Generate examples

5. PREDICTION & VERIFICATION
   "I think... will happen because..."
   - Predict outcomes
   - Test predictions
   - Explain discrepancies`;
        const { text } = await (0, ai_1.generateText)({
            model: context.modelRouting.model,
            system: systemPrompt,
            prompt: `Content: "${context.content || context.userMessage}"
Generate self-explanation prompts and steps.`,
            temperature: 0.7
        });
        return {
            technique: 'Self-Explanation',
            steps: [
                {
                    step: 1,
                    instruction: "Read one paragraph/problem and pause",
                    timeEstimate: 2,
                    checkpoint: "Understood the surface content"
                },
                {
                    step: 2,
                    instruction: "Explain WHY this is true/works",
                    example: "This formula works because...",
                    timeEstimate: 3,
                    checkpoint: "Identified underlying principle"
                },
                {
                    step: 3,
                    instruction: "Connect to something you already know",
                    example: "This is like... because both...",
                    timeEstimate: 2,
                    checkpoint: "Made explicit connection"
                },
                {
                    step: 4,
                    instruction: "Generate your own example",
                    example: "Another case would be...",
                    timeEstimate: 3,
                    checkpoint: "Created novel application"
                }
            ],
            expectedTime: 10,
            difficultyLevel: 'medium',
            metadata: {
                toolName: 'self_explanation',
                researchBacking: 'Chi et al. (1994)',
                effectSize: 0.61
            }
        };
    }
}
exports.SelfExplanationTool = SelfExplanationTool;
/**
 * Dual Coding Strategy Implementation
 */
class DualCodingTool {
    async execute(context) {
        const systemPrompt = `You are Ellen, implementing dual coding strategy.

RESEARCH: Paivio (1991) - Dual Coding Theory
Effect Size: d = 0.60 (moderate)

DUAL CODING TECHNIQUES:

1. CONCEPT VISUALIZATION
   - Draw the concept
   - Label key parts
   - Show relationships
   - Use color coding

2. PROCESS DIAGRAMS
   - Flowcharts for sequences
   - Arrows for causation
   - Boxes for categories
   - Timelines for chronology

3. MEMORY PALACES
   - Assign concepts to locations
   - Create visual stories
   - Use bizarre imagery
   - Walk through mentally

4. GRAPHIC ORGANIZERS
   - Mind maps for connections
   - Venn diagrams for comparison
   - Matrices for categories
   - Hierarchies for organization

5. SKETCH-TO-STRETCH
   - Quick sketches while reading
   - Symbols for key ideas
   - Visual metaphors
   - Doodle summaries`;
        const { text } = await (0, ai_1.generateText)({
            model: context.modelRouting.model,
            system: systemPrompt,
            prompt: `Material: "${context.content || context.userMessage}"
Create dual coding implementation steps.`,
            temperature: 0.7
        });
        return {
            technique: 'Dual Coding',
            steps: [
                {
                    step: 1,
                    instruction: "Identify 3-5 key concepts to visualize",
                    timeEstimate: 3,
                    checkpoint: "Have list of visualizable elements"
                },
                {
                    step: 2,
                    instruction: "Create simple diagram/sketch for each",
                    example: "Use circles, arrows, stick figures",
                    timeEstimate: 10,
                    checkpoint: "Each concept has visual representation"
                },
                {
                    step: 3,
                    instruction: "Add labels and connections",
                    example: "Write keywords, draw relationship lines",
                    timeEstimate: 5,
                    checkpoint: "Visuals are self-explanatory"
                },
                {
                    step: 4,
                    instruction: "Test by recreating from memory",
                    timeEstimate: 5,
                    checkpoint: "Can redraw without looking"
                }
            ],
            expectedTime: 23,
            difficultyLevel: 'easy',
            metadata: {
                toolName: 'dual_coding',
                researchBacking: 'Paivio (1991) - Dual Coding Theory',
                effectSize: 0.60
            }
        };
    }
}
exports.DualCodingTool = DualCodingTool;
/**
 * Desirable Difficulties Implementation
 */
class DesirableDifficultiesPracticeTool {
    async execute(context) {
        const systemPrompt = `You are Ellen, implementing desirable difficulties.

RESEARCH: Bjork & Bjork (2011) - Making Things Hard on Yourself
Key Principle: Short-term struggle → Long-term gain

DESIRABLE DIFFICULTY TECHNIQUES:

1. SPACING (vs Massing)
   - Distribute practice over time
   - Allow forgetting between sessions
   - Increases effort but improves retention
   Schedule: 1-3-7-21-30 days

2. INTERLEAVING (vs Blocking)
   - Mix different topics/problems
   - ABCABC not AABBCC
   - Harder but better discrimination
   Pattern: Rotate every 15-20 minutes

3. TESTING (vs Restudying)
   - Test before feeling ready
   - Struggle productive
   - Reveals true knowledge state
   Timing: Test at 80% ready

4. GENERATION (vs Reading)
   - Produce answers, don't select
   - Fill in blanks
   - Create examples
   - Harder but deeper processing

5. VARIATION (vs Repetition)
   - Change contexts
   - Vary problem types
   - Different examples
   - Reduces context dependence`;
        const { text } = await (0, ai_1.generateText)({
            model: context.modelRouting.model,
            system: systemPrompt,
            prompt: `Learning goal: "${context.userMessage}"
Design practice with desirable difficulties.`,
            temperature: 0.7
        });
        return {
            technique: 'Desirable Difficulties',
            steps: [
                {
                    step: 1,
                    instruction: "Space your practice: Study now, review tomorrow, test in 3 days",
                    timeEstimate: 5,
                    checkpoint: "Calendar scheduled with gaps"
                },
                {
                    step: 2,
                    instruction: "Mix topics: Switch subjects every 20 minutes",
                    example: "Math → History → Math → Science",
                    timeEstimate: 60,
                    checkpoint: "Completed interleaved session"
                },
                {
                    step: 3,
                    instruction: "Test early: Quiz yourself at 80% ready",
                    example: "Don't wait until you feel confident",
                    timeEstimate: 15,
                    checkpoint: "Struggled but learned from errors"
                },
                {
                    step: 4,
                    instruction: "Generate, don't recognize: Create answers from scratch",
                    timeEstimate: 10,
                    checkpoint: "Produced rather than selected"
                }
            ],
            expectedTime: 90,
            difficultyLevel: 'hard',
            metadata: {
                toolName: 'desirable_difficulties',
                researchBacking: 'Bjork & Bjork (2011)',
                effectSize: 0.70
            }
        };
    }
}
exports.DesirableDifficultiesPracticeTool = DesirableDifficultiesPracticeTool;
/**
 * Strategy Implementation Orchestrator
 */
class StrategyImplementationOrchestrator {
    classTroubleshooter = new ClassTroubleshooterTool();
    retrievalPractice = new RetrievalPracticeTool();
    selfExplanation = new SelfExplanationTool();
    dualCoding = new DualCodingTool();
    desirableDifficulties = new DesirableDifficultiesPracticeTool();
    async selectAndExecute(context, strategyName) {
        if (strategyName) {
            return this.executeStrategy(strategyName, context);
        }
        // Auto-select based on context
        const message = context.userMessage.toLowerCase();
        if (message.includes('problem') || message.includes('issue') ||
            message.includes('struggling')) {
            return this.classTroubleshooter.execute(context);
        }
        if (message.includes('remember') || message.includes('recall') ||
            message.includes('test')) {
            return this.retrievalPractice.execute(context);
        }
        if (message.includes('understand') || message.includes('explain')) {
            return this.selfExplanation.execute(context);
        }
        if (message.includes('visual') || message.includes('diagram') ||
            message.includes('draw')) {
            return this.dualCoding.execute(context);
        }
        // Default to retrieval practice (highest effect size)
        return this.retrievalPractice.execute(context);
    }
    async executeStrategy(name, context) {
        switch (name) {
            case 'troubleshooter':
                return this.classTroubleshooter.execute(context);
            case 'retrieval':
                return this.retrievalPractice.execute(context);
            case 'self_explanation':
                return this.selfExplanation.execute(context);
            case 'dual_coding':
                return this.dualCoding.execute(context);
            case 'desirable_difficulties':
                return this.desirableDifficulties.execute(context);
            default:
                return this.retrievalPractice.execute(context);
        }
    }
}
exports.StrategyImplementationOrchestrator = StrategyImplementationOrchestrator;
