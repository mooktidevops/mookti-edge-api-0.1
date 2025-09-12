"use strict";
/**
 * Ellen's Planning Tools Implementation
 *
 * Study planning with WOOP mental contrasting, spaced repetition,
 * and focus session management based on cognitive science.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanningToolsOrchestrator = exports.FocusSessionTool = exports.PlanManagerTool = void 0;
const ai_1 = require("ai");
/**
 * Plan Manager - Study planning with spaced repetition and interleaving
 */
class PlanManagerTool {
    async execute(context) {
        const systemPrompt = `You are Ellen, a learning plan specialist using evidence-based scheduling techniques.

RESEARCH BASIS:
- Oettingen (2014) - WOOP Mental Contrasting
  • Wish → Outcome → Obstacle → Plan
  • Mental contrasting increases goal attainment by 2x
  • If-then planning (implementation intentions) crucial

- Cepeda et al. (2006) - Distributed Practice Meta-analysis
  • Optimal spacing interval = 10-20% of retention interval
  • For 1 month retention: review at 3-6 days
  • For 6 months: review at 2-4 weeks

- Rohrer & Taylor (2007) - Interleaving Benefits
  • Mixed practice > blocked practice for math (243% better)
  • Interleave similar subjects for discrimination learning

- Dunlosky et al. (2013) - Effective Techniques
  • HIGH UTILITY: Practice testing, distributed practice
  • MODERATE: Elaborative interrogation, self-explanation, interleaving
  • LOW: Highlighting, rereading, summarization

PLANNING FRAMEWORK:

1. WOOP STRUCTURE (ALWAYS include):
   WISH: What do you want to accomplish?
   OUTCOME: How will you feel when successful?
   OBSTACLE: What internal obstacles might arise?
   PLAN: If [obstacle], then I will [action]

2. SPACING SCHEDULE:
   - Day 1: Initial learning
   - Day 2: First review (next day)
   - Day 4-7: Second review
   - Day 14-21: Third review
   - Day 30+: Monthly reviews

3. SESSION STRUCTURE (based on attention research):
   - 25-50 min focus blocks (ultradian rhythms)
   - 5-15 min breaks
   - Max 3-4 deep sessions/day
   - Light review in fatigue periods

4. INTERLEAVING PATTERN:
   - ABCABC not AABBCC
   - Mix problem types within sessions
   - Alternate declarative/procedural learning

5. TECHNIQUE ASSIGNMENT:
   - Active recall for facts/concepts
   - Practice problems for procedures
   - Elaboration for connections
   - Teaching for synthesis

INTENSITY LEVELS:
- DEEP (morning/peak): New material, problem-solving
- MEDIUM (afternoon): Practice, application
- LIGHT (evening/tired): Review, organization

NEVER:
- Schedule more than 4 deep focus hours/day
- Plan study immediately after meals
- Ignore circadian preferences
- Forget implementation intentions`;
        const userPrompt = this.buildPlanningPrompt(context);
        const { text } = await (0, ai_1.generateText)({
            model: context.modelRouting.model,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.7
        });
        return this.parsePlanResponse(text, context);
    }
    buildPlanningPrompt(context) {
        let prompt = `User's planning request: "${context.userMessage}"`;
        if (context.goal) {
            prompt += `\nPrimary goal: ${context.goal}`;
        }
        if (context.timeframe) {
            prompt += `\nTimeframe: ${context.timeframe}`;
        }
        if (context.subjects?.length) {
            prompt += `\nSubjects to study: ${context.subjects.join(', ')}`;
        }
        if (context.constraints?.length) {
            prompt += `\nConstraints: ${context.constraints.join('; ')}`;
        }
        if (context.preferredTimes?.length) {
            prompt += `\nPreferred study times: ${context.preferredTimes.join(', ')}`;
        }
        prompt += `\n\nCreate a study plan with:
1. WOOP mental contrasting structure
2. Specific daily/weekly schedule using spacing and interleaving
3. Technique recommendations
4. Implementation intentions for obstacles`;
        return prompt;
    }
    parsePlanResponse(text, context) {
        // Extract WOOP structure
        const woopPlan = this.extractWOOP(text);
        // Extract schedule blocks
        const dailyBlocks = this.extractScheduleBlocks(text);
        // Extract strategies
        const strategies = this.extractStrategies(text);
        return {
            plan: {
                daily: dailyBlocks,
                milestones: this.generateMilestones(context)
            },
            strategies,
            woopPlan,
            metadata: {
                toolName: 'plan_manager',
                techniqueRecommendations: ['active_recall', 'spaced_repetition', 'interleaving'],
                difficultyCalibration: 'balanced'
            }
        };
    }
    extractWOOP(text) {
        const wishMatch = text.match(/wish:?\s*(.*?)(?=outcome|obstacle|$)/is);
        const outcomeMatch = text.match(/outcome:?\s*(.*?)(?=obstacle|plan|$)/is);
        const obstacleMatch = text.match(/obstacles?:?\s*(.*?)(?=plan|if-then|$)/is);
        const planMatch = text.match(/(?:plan|if-then):?\s*(.*?)$/is);
        return {
            wish: wishMatch?.[1]?.trim() || "Achieve learning goal",
            outcome: outcomeMatch?.[1]?.trim() || "Feel confident and prepared",
            obstacles: obstacleMatch?.[1]?.split(/[,;]/).map(o => o.trim()) || ["Procrastination", "Fatigue"],
            plan: planMatch?.[1]?.split(/[;.]/).filter(p => p.includes('then')).map(p => p.trim()) ||
                ["If I feel like procrastinating, then I will start with just 5 minutes"]
        };
    }
    extractScheduleBlocks(text) {
        // Simple extraction - in production would be more sophisticated
        const blocks = [];
        // Default schedule based on best practices
        blocks.push({
            time: "9:00 AM",
            duration: 50,
            subject: "Deep Work",
            technique: "active_recall",
            intensity: 'deep'
        }, {
            time: "2:00 PM",
            duration: 45,
            subject: "Practice",
            technique: "problem_solving",
            intensity: 'medium'
        }, {
            time: "7:00 PM",
            duration: 30,
            subject: "Review",
            technique: "spaced_repetition",
            intensity: 'light'
        });
        return blocks;
    }
    extractStrategies(text) {
        const strategies = [];
        if (text.includes('active recall') || text.includes('testing')) {
            strategies.push("Use active recall with flashcards or practice tests");
        }
        if (text.includes('spac') || text.includes('distribut')) {
            strategies.push("Space reviews at expanding intervals");
        }
        if (text.includes('interleav')) {
            strategies.push("Mix different topics within study sessions");
        }
        return strategies;
    }
    generateMilestones(context) {
        const milestones = [];
        if (context.timeframe?.includes('week')) {
            milestones.push({
                date: '1 week',
                goal: 'Complete initial learning phase',
                assessmentMethod: 'Self-quiz on key concepts'
            });
        }
        if (context.timeframe?.includes('month')) {
            milestones.push({
                date: '2 weeks',
                goal: 'Master fundamentals',
                assessmentMethod: 'Practice test'
            });
            milestones.push({
                date: '1 month',
                goal: 'Full competency',
                assessmentMethod: 'Comprehensive assessment'
            });
        }
        return milestones;
    }
}
exports.PlanManagerTool = PlanManagerTool;
/**
 * Focus Session Tool - Pomodoro variants with cognitive science
 */
class FocusSessionTool {
    async execute(context) {
        const systemPrompt = `You are Ellen, managing focused study sessions based on attention research.

RESEARCH BASIS:
- Kleitman (1963) - Ultradian Rhythms
  • 90-120 minute cycles of alertness
  • Peak focus for 50-90 minutes
  • Natural break needs every ultradian cycle

- Ericsson et al. (1993) - Deliberate Practice
  • Elite performers: 3-4 hours max deep practice/day
  • Sessions of 60-90 minutes
  • Must be effortful and focused

- Ariga & Lleras (2011) - Brief Mental Breaks
  • Brief breaks prevent vigilance decrement
  • 5 min break after 50 min optimal
  • Task-switching during breaks helps

FOCUS SESSION VARIANTS:

1. CLASSIC POMODORO (25-5-25-5-25-5-25-15):
   - Best for: Tasks you resist
   - Why: Low commitment threshold

2. FLOWMODORO (45-50 min work, 10-15 min break):
   - Best for: Deep work, coding, writing
   - Why: Matches attention span research

3. ULTRADIAN (90 work, 20 break):
   - Best for: Creative work, learning
   - Why: Aligns with biological rhythms

4. TIMEBOXING (varied blocks):
   - Best for: Mixed task types
   - Why: Matches task to energy

DURING FOCUS BLOCKS:
- Single-task only
- Phone in another room (Thornton & Faires, 2014)
- Clear goal for session
- Active engagement required

DURING BREAKS:
- Physical movement preferred
- No social media (cognitive residue)
- Hydration and light stretching
- Brief mindfulness if anxious

SESSION CALIBRATION:
- Morning: Highest difficulty tasks
- Post-lunch dip (1-3pm): Routine tasks
- Late afternoon: Creative work
- Evening: Review and planning

IMPLEMENTATION INTENTIONS:
- "When timer starts, I will [specific action]"
- "If distracted, I will note it and return"
- "When break starts, I will stand immediately"`;
        const userPrompt = `User's request: "${context.userMessage}"
${context.sessionType ? `\nSession type: ${context.sessionType}` : ''}
${context.timeframe ? `\nAvailable time: ${context.timeframe}` : ''}
${context.goal ? `\nSession goal: ${context.goal}` : ''}

Design an optimal focus session structure.`;
        const { text } = await (0, ai_1.generateText)({
            model: context.modelRouting.model,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.7
        });
        return this.parseFocusResponse(text, context);
    }
    parseFocusResponse(text, context) {
        // Extract session structure
        const sessionBlocks = this.extractSessionStructure(text);
        return {
            plan: {
                daily: sessionBlocks
            },
            strategies: [
                "Use timer for accountability",
                "Clear goal before starting",
                "Phone in another room",
                "Movement during breaks"
            ],
            metadata: {
                toolName: 'focus_session',
                totalHours: this.calculateTotalHours(sessionBlocks),
                techniqueRecommendations: this.getSessionTechniques(context)
            }
        };
    }
    extractSessionStructure(text) {
        const blocks = [];
        // Detect which variant was recommended
        if (text.toLowerCase().includes('pomodoro')) {
            // Classic Pomodoro structure
            for (let i = 0; i < 4; i++) {
                blocks.push({
                    time: `Block ${i + 1}`,
                    duration: 25,
                    subject: 'Focus Work',
                    technique: 'deep_focus',
                    intensity: 'deep'
                });
            }
        }
        else if (text.toLowerCase().includes('flowmodoro') || text.includes('45')) {
            // Flowmodoro structure
            blocks.push({
                time: 'Focus Block',
                duration: 45,
                subject: 'Deep Work',
                technique: 'flow_state',
                intensity: 'deep'
            });
        }
        else {
            // Default ultradian
            blocks.push({
                time: 'Ultradian Block',
                duration: 90,
                subject: 'Deep Learning',
                technique: 'immersive_focus',
                intensity: 'deep'
            });
        }
        return blocks;
    }
    calculateTotalHours(blocks) {
        return blocks.reduce((total, block) => total + block.duration, 0) / 60;
    }
    getSessionTechniques(context) {
        const techniques = [];
        switch (context.sessionType) {
            case 'study':
                techniques.push('active_recall', 'elaboration');
                break;
            case 'writing':
                techniques.push('freewriting', 'outlining');
                break;
            case 'review':
                techniques.push('spaced_repetition', 'self_testing');
                break;
            case 'practice':
                techniques.push('problem_sets', 'worked_examples');
                break;
            default:
                techniques.push('deep_focus', 'active_engagement');
        }
        return techniques;
    }
}
exports.FocusSessionTool = FocusSessionTool;
/**
 * Planning Tools Orchestrator
 */
class PlanningToolsOrchestrator {
    planManager = new PlanManagerTool();
    focusSession = new FocusSessionTool();
    async selectAndExecute(context, toolName) {
        // If specific tool requested, use it
        if (toolName === 'focus_session') {
            return this.focusSession.execute(context);
        }
        if (toolName === 'plan_manager') {
            return this.planManager.execute(context);
        }
        // Auto-select based on context
        const message = context.userMessage.toLowerCase();
        if (message.includes('session') || message.includes('pomodoro') ||
            message.includes('focus') || message.includes('concentrate')) {
            return this.focusSession.execute(context);
        }
        if (message.includes('plan') || message.includes('schedule') ||
            message.includes('study') || message.includes('woop')) {
            return this.planManager.execute(context);
        }
        // Default to plan manager for comprehensive planning
        return this.planManager.execute(context);
    }
}
exports.PlanningToolsOrchestrator = PlanningToolsOrchestrator;
