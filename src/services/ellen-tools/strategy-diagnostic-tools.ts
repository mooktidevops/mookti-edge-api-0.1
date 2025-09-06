/**
 * Ellen's Strategy and Diagnostic Tools
 * 
 * Evidence-based learning diagnostics and strategy selection
 * to optimize individual learning approaches.
 */

import { generateText } from 'ai';
import { ModelRoutingResult } from '../../../lib/ai/model-router';

export interface DiagnosticContext {
  symptoms?: string[]; // "forgetting quickly", "test anxiety", "can't focus"
  currentMethods?: string[]; // What they're currently doing
  performanceGaps?: string[]; // Where they're struggling
  learningHistory?: string; // Past successes/failures
  constraints?: string[]; // Time, resources, etc.
  userMessage: string;
  modelRouting: ModelRoutingResult;
}

export interface DiagnosticResult {
  diagnosis: {
    primaryIssues: string[];
    underlyingCauses: string[];
    strengthsIdentified: string[];
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  strategies: StrategyRecommendation[];
  metadata?: {
    toolName: string;
    confidence: 'high' | 'medium' | 'low';
    evidenceBase: string[];
  };
}

export interface StrategyRecommendation {
  name: string;
  description: string;
  whyItHelps: string;
  howToImplement: string[];
  expectedOutcome: string;
  researchBacking?: string;
}

/**
 * Learning Diagnostic Tool - Identify learning challenges and gaps
 */
export class LearningDiagnosticTool {
  async execute(context: DiagnosticContext): Promise<DiagnosticResult> {
    const systemPrompt = `You are Ellen, diagnosing learning challenges using cognitive science.

RESEARCH BASIS FOR COMMON ISSUES:

1. FORGETTING QUICKLY
   - Cause: No spaced repetition (Ebbinghaus, 1885)
   - Solution: Spacing effect (Cepeda et al., 2006)
   - Implementation: 1-2-4-7-14 day review schedule

2. CAN'T FOCUS/DISTRACTED
   - Cause: Attention residue (Leroy, 2009)
   - Solution: Time-boxing + environment design
   - Implementation: Remove phones, block websites, single-tasking

3. TEST ANXIETY
   - Cause: Retrieval failure under stress (Beilock, 2010)
   - Solution: Testing effect + stress inoculation
   - Implementation: Practice tests under timed conditions

4. SURFACE LEARNING
   - Cause: Passive processing (Craik & Lockhart, 1972)
   - Solution: Elaborative rehearsal + generation effect
   - Implementation: Self-explanation, teaching others

5. POOR TRANSFER
   - Cause: Context-dependent learning (Godden & Baddeley, 1975)
   - Solution: Varied practice contexts
   - Implementation: Study in different locations, interleaving

6. ILLUSION OF COMPETENCE
   - Cause: Fluency heuristic (Bjork et al., 2013)
   - Solution: Desirable difficulties + testing
   - Implementation: Delayed testing, generation not recognition

DIAGNOSTIC FRAMEWORK:

1. IDENTIFY SYMPTOMS
   - What specific behaviors/outcomes indicate the problem?
   - When does it occur? (timing, context, subject)
   - How severe is the impact?

2. TRACE ROOT CAUSES
   - Cognitive: Working memory, processing speed, prior knowledge
   - Metacognitive: Planning, monitoring, evaluation
   - Motivational: Interest, self-efficacy, goal orientation
   - Environmental: Distractions, resources, support

3. ASSESS STRENGTHS
   - What's working well?
   - Past successful strategies?
   - Available resources?

4. PRESCRIBE INTERVENTIONS
   - Evidence-based strategies
   - Graduated implementation (start small)
   - Progress monitoring plan

COMMON MISDIAGNOSES TO AVOID:
- "Bad at math" → Often procedural vs conceptual confusion
- "Can't write" → Often planning vs translation issue
- "Poor memory" → Often encoding vs retrieval issue
- "Slow learner" → Often inefficient strategies`;

    const userPrompt = this.buildDiagnosticPrompt(context);

    const { text } = await generateText({
      model: context.modelRouting.model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.6
    });

    return this.parseDiagnosticResponse(text, context);
  }

  private buildDiagnosticPrompt(context: DiagnosticContext): string {
    let prompt = `Student describes: "${context.userMessage}"`;
    
    if (context.symptoms?.length) {
      prompt += `\nSpecific symptoms: ${context.symptoms.join(', ')}`;
    }
    
    if (context.currentMethods?.length) {
      prompt += `\nCurrent study methods: ${context.currentMethods.join(', ')}`;
    }
    
    if (context.performanceGaps?.length) {
      prompt += `\nStruggling with: ${context.performanceGaps.join(', ')}`;
    }
    
    if (context.learningHistory) {
      prompt += `\nLearning history: ${context.learningHistory}`;
    }
    
    prompt += `\n\nProvide a learning diagnosis with:
1. Primary issues and root causes
2. Strengths to build on
3. Specific evidence-based interventions
4. Implementation plan`;
    
    return prompt;
  }

  private parseDiagnosticResponse(text: string, context: DiagnosticContext): DiagnosticResult {
    // Extract primary issues
    const primaryIssues = this.extractPrimaryIssues(text, context);
    
    // Extract recommended strategies
    const strategies = this.extractStrategies(text);
    
    return {
      diagnosis: {
        primaryIssues,
        underlyingCauses: this.identifyUnderlyingCauses(primaryIssues),
        strengthsIdentified: this.extractStrengths(text)
      },
      recommendations: {
        immediate: ["Start with one small change", "Track progress for 1 week"],
        shortTerm: strategies.slice(0, 2).map(s => s.name),
        longTerm: ["Build comprehensive study system", "Regular strategy evaluation"]
      },
      strategies,
      metadata: {
        toolName: 'learning_diagnostic',
        confidence: this.assessConfidence(context),
        evidenceBase: this.getRelevantResearch(primaryIssues)
      }
    };
  }

  private extractPrimaryIssues(text: string, context: DiagnosticContext): string[] {
    const issues: string[] = [];
    
    // Pattern matching for common issues
    if (text.includes('forget') || text.includes('retention')) {
      issues.push('Memory retention challenges');
    }
    
    if (text.includes('focus') || text.includes('distract')) {
      issues.push('Attention management difficulties');
    }
    
    if (text.includes('anxiety') || text.includes('stress')) {
      issues.push('Test anxiety affecting performance');
    }
    
    if (text.includes('surface') || text.includes('shallow')) {
      issues.push('Surface-level processing');
    }
    
    return issues.length > 0 ? issues : ['General study strategy optimization needed'];
  }

  private identifyUnderlyingCauses(issues: string[]): string[] {
    const causeMap: Record<string, string> = {
      'Memory retention challenges': 'Lack of spaced repetition and active recall',
      'Attention management difficulties': 'Environment design and cognitive load issues',
      'Test anxiety affecting performance': 'Insufficient retrieval practice under pressure',
      'Surface-level processing': 'Passive learning strategies dominate'
    };
    
    return issues.map(issue => causeMap[issue] || 'Strategy-skill mismatch');
  }

  private extractStrengths(text: string): string[] {
    const strengths: string[] = [];
    
    if (text.includes('motivation') || text.includes('dedicated')) {
      strengths.push('Strong motivation to improve');
    }
    
    if (text.includes('aware') || text.includes('recogniz')) {
      strengths.push('Good self-awareness of challenges');
    }
    
    return strengths.length > 0 ? strengths : ['Seeking help proactively'];
  }

  private extractStrategies(text: string): StrategyRecommendation[] {
    // Default evidence-based strategies
    return [
      {
        name: 'Spaced Repetition System',
        description: 'Review material at expanding intervals',
        whyItHelps: 'Fights forgetting curve, strengthens long-term retention',
        howToImplement: [
          'Review new material within 24 hours',
          'Second review at 3 days',
          'Third review at 1 week',
          'Monthly reviews thereafter'
        ],
        expectedOutcome: '40-50% better retention after 1 month',
        researchBacking: 'Cepeda et al. (2006) meta-analysis'
      },
      {
        name: 'Active Recall Testing',
        description: 'Test yourself without looking at notes',
        whyItHelps: 'Strengthens retrieval pathways, reveals knowledge gaps',
        howToImplement: [
          'Close notes and write everything you remember',
          'Create practice questions while studying',
          'Use flashcards with answers hidden',
          'Teach material to imaginary student'
        ],
        expectedOutcome: '50% better retention than rereading',
        researchBacking: 'Roediger & Karpicke (2006)'
      }
    ];
  }

  private assessConfidence(context: DiagnosticContext): 'high' | 'medium' | 'low' {
    const infoPoints = [
      context.symptoms?.length || 0,
      context.currentMethods?.length || 0,
      context.performanceGaps?.length || 0,
      context.learningHistory ? 1 : 0
    ].reduce((a, b) => a + b, 0);
    
    if (infoPoints >= 5) return 'high';
    if (infoPoints >= 3) return 'medium';
    return 'low';
  }

  private getRelevantResearch(issues: string[]): string[] {
    const research: string[] = [];
    
    if (issues.some(i => i.includes('Memory'))) {
      research.push('Ebbinghaus (1885) - Forgetting curve');
      research.push('Cepeda et al. (2006) - Spacing effect');
    }
    
    if (issues.some(i => i.includes('Attention'))) {
      research.push('Leroy (2009) - Attention residue');
      research.push('Rosen & Gazzaley (2013) - Distraction impact');
    }
    
    return research;
  }
}

/**
 * Strategy Selector Tool - Match strategies to individual needs
 */
export class StrategySelectionTool {
  async execute(context: DiagnosticContext): Promise<DiagnosticResult> {
    const systemPrompt = `You are Ellen, helping students select optimal learning strategies.

STRATEGY MATCHING FRAMEWORK:

BY LEARNING GOAL:
- MEMORIZATION: Spaced repetition, mnemonics, method of loci
- UNDERSTANDING: Elaboration, self-explanation, concept mapping
- APPLICATION: Worked examples, deliberate practice, problem sets
- ANALYSIS: Compare-contrast, decomposition, case studies
- SYNTHESIS: Project-based, cross-domain connections, creation

BY MATERIAL TYPE:
- FACTS: Flashcards, spaced repetition
- CONCEPTS: Concept maps, examples/non-examples
- PROCEDURES: Worked examples → problem solving
- PROCESSES: Flowcharts, simulations
- PRINCIPLES: Case analysis, application scenarios

BY TIME CONSTRAINT:
- CRAMMING (not recommended but sometimes necessary):
  • Focus on high-yield topics
  • Active recall over passive review
  • Teach-back method for quick consolidation
  
- SHORT-TERM (1-2 weeks):
  • Distributed practice with 2-3 day intervals
  • Mixed practice sessions
  • Practice testing
  
- LONG-TERM (months):
  • Spaced repetition system
  • Interleaving
  • Elaborative rehearsal

BY LEARNING STYLE MYTH CORRECTION:
Despite popular belief, matching to "learning styles" (VARK) doesn't improve outcomes (Pashler et al., 2008).
Instead, match to:
- Prior knowledge level
- Task demands
- Cognitive load capacity

EVIDENCE-BASED STRATEGY HIERARCHY:
TIER 1 (Highest Evidence):
- Practice testing (d = 0.90)
- Distributed practice (d = 0.85)
- Interleaved practice (d = 0.81)

TIER 2 (Moderate Evidence):
- Elaborative interrogation (d = 0.65)
- Self-explanation (d = 0.61)
- Combined multimedia (d = 0.60)

TIER 3 (Lower Evidence):
- Summarization (d = 0.30)
- Highlighting (d = 0.20)
- Rereading (d = 0.15)

PERSONALIZATION FACTORS:
1. Prior knowledge (novice → expert)
2. Working memory capacity
3. Time available
4. Motivation level
5. Metacognitive awareness`;

    const userPrompt = `Student request: "${context.userMessage}"
${context.currentMethods?.length ? `\nCurrently using: ${context.currentMethods.join(', ')}` : ''}
${context.constraints?.length ? `\nConstraints: ${context.constraints.join(', ')}` : ''}

Recommend optimal strategies based on evidence and individual factors.`;

    const { text } = await generateText({
      model: context.modelRouting.model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7
    });

    return this.parseStrategyResponse(text);
  }

  private parseStrategyResponse(text: string): DiagnosticResult {
    const strategies = this.extractRecommendedStrategies(text);
    
    return {
      diagnosis: {
        primaryIssues: ['Strategy optimization needed'],
        underlyingCauses: ['Current methods may not match task demands'],
        strengthsIdentified: ['Proactive strategy seeking']
      },
      recommendations: {
        immediate: strategies.slice(0, 1).map(s => `Start with ${s.name}`),
        shortTerm: strategies.slice(1, 3).map(s => `Add ${s.name}`),
        longTerm: ['Build personalized strategy toolkit']
      },
      strategies,
      metadata: {
        toolName: 'strategy_selector',
        confidence: 'high',
        evidenceBase: ['Dunlosky et al. (2013)', 'Pashler et al. (2008)']
      }
    };
  }

  private extractRecommendedStrategies(text: string): StrategyRecommendation[] {
    const strategies: StrategyRecommendation[] = [];
    
    // Extract Tier 1 strategies if mentioned
    if (text.includes('testing') || text.includes('recall')) {
      strategies.push(this.getPracticeTestingStrategy());
    }
    
    if (text.includes('spac') || text.includes('distribut')) {
      strategies.push(this.getSpacedPracticeStrategy());
    }
    
    if (text.includes('interleav') || text.includes('mix')) {
      strategies.push(this.getInterleavingStrategy());
    }
    
    // Ensure at least 2 strategies
    if (strategies.length < 2) {
      strategies.push(this.getPracticeTestingStrategy());
      strategies.push(this.getSpacedPracticeStrategy());
    }
    
    return strategies;
  }

  private getPracticeTestingStrategy(): StrategyRecommendation {
    return {
      name: 'Practice Testing',
      description: 'Regular self-testing without notes',
      whyItHelps: 'Strongest evidence for retention (d=0.90)',
      howToImplement: [
        'Create questions while studying',
        'Test yourself before feeling ready',
        'Use varied question formats',
        'Space tests over time'
      ],
      expectedOutcome: '2x better retention than rereading',
      researchBacking: 'Roediger & Butler (2011) review'
    };
  }

  private getSpacedPracticeStrategy(): StrategyRecommendation {
    return {
      name: 'Distributed Practice',
      description: 'Spread learning over time',
      whyItHelps: 'Consolidation between sessions (d=0.85)',
      howToImplement: [
        'Break content into chunks',
        'Review at expanding intervals',
        'Mix old and new material',
        'Use calendar reminders'
      ],
      expectedOutcome: '200% better long-term retention',
      researchBacking: 'Cepeda et al. (2006) meta-analysis'
    };
  }

  private getInterleavingStrategy(): StrategyRecommendation {
    return {
      name: 'Interleaved Practice',
      description: 'Mix different topics/problem types',
      whyItHelps: 'Improves discrimination and transfer (d=0.81)',
      howToImplement: [
        'Alternate between topics (ABCABC not AABBCC)',
        'Mix problem types within sessions',
        'Compare and contrast differences',
        'Practice identifying problem types'
      ],
      expectedOutcome: '43% better on mixed tests',
      researchBacking: 'Rohrer (2012) review'
    };
  }
}

/**
 * Metacognitive Calibration Tool - Assess and improve self-awareness
 */
export class MetacognitiveCalibrationTool {
  async execute(context: DiagnosticContext): Promise<DiagnosticResult> {
    const systemPrompt = `You are Ellen, helping students calibrate their metacognitive awareness.

RESEARCH BASIS:
- Kruger & Dunning (1999) - Dunning-Kruger Effect
  • Low performers overestimate ability
  • High performers underestimate
  • Metacognitive training improves accuracy

- Thiede et al. (2003) - Metacomprehension Accuracy
  • Delayed judgments more accurate
  • Generation improves calibration
  • Keyword method enhances accuracy

- Pressley & Ghatala (1990) - Strategy Monitoring
  • Students poor at judging strategy effectiveness
  • Need explicit feedback on strategy outcomes
  • Performance monitoring improves selection

CALIBRATION ASSESSMENT:
1. CONFIDENCE vs PERFORMANCE
   - "Rate confidence 1-10 before test"
   - Compare to actual performance
   - Identify over/under confidence patterns

2. JUDGMENT OF LEARNING (JOL)
   - "What % will you remember tomorrow?"
   - Test actual retention
   - Track calibration accuracy

3. STRATEGY EFFECTIVENESS
   - "How well did this method work?"
   - Compare perceived vs actual gains
   - Identify strategy illusions

CALIBRATION TECHNIQUES:
1. DELAYED JOL
   - Wait 5-10 min after learning
   - More accurate than immediate
   - Tests retrieval not familiarity

2. SELF-TESTING
   - Reveals actual knowledge state
   - Breaks illusion of competence
   - Provides calibration feedback

3. GENERATION
   - Produce answers not recognize
   - Keywords, summaries, questions
   - More accurate self-assessment

4. PEER COMPARISON
   - Calibrate against others
   - Reduces extreme judgments
   - Social calibration

COMMON CALIBRATION ERRORS:
- Fluency illusion: "It feels easy so I know it"
- Stability bias: "I'll remember this forever"
- Hindsight bias: "I knew that all along"
- Overconfidence: "I don't need more practice"`;

    const userPrompt = `Student situation: "${context.userMessage}"

Assess metacognitive calibration and provide techniques to improve self-awareness.`;

    const { text } = await generateText({
      model: context.modelRouting.model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.6
    });

    return {
      diagnosis: {
        primaryIssues: ['Metacognitive calibration needs assessment'],
        underlyingCauses: ['Common cognitive biases affecting self-assessment'],
        strengthsIdentified: ['Awareness that calibration matters']
      },
      recommendations: {
        immediate: ['Start confidence ratings before assessments'],
        shortTerm: ['Implement delayed self-testing'],
        longTerm: ['Build calibration tracking system']
      },
      strategies: [
        {
          name: 'Delayed Judgment of Learning',
          description: 'Rate understanding after delay, not immediately',
          whyItHelps: 'More accurate prediction of retention',
          howToImplement: [
            'Study material normally',
            'Wait 10 minutes doing other tasks',
            'Rate "How well do I know this?" 1-10',
            'Test yourself and compare'
          ],
          expectedOutcome: '2x more accurate self-assessment',
          researchBacking: 'Thiede et al. (2003)'
        }
      ],
      metadata: {
        toolName: 'metacognitive_calibration',
        confidence: 'high',
        evidenceBase: ['Kruger & Dunning (1999)', 'Thiede et al. (2003)']
      }
    };
  }
}

/**
 * Strategy & Diagnostic Tools Orchestrator
 */
export class StrategyDiagnosticOrchestrator {
  private learningDiagnostic = new LearningDiagnosticTool();
  private strategySelector = new StrategySelectionTool();
  private metacognitiveCalibration = new MetacognitiveCalibrationTool();
  
  async selectAndExecute(
    context: DiagnosticContext,
    toolName?: string
  ): Promise<DiagnosticResult> {
    if (toolName === 'learning_diagnostic') {
      return this.learningDiagnostic.execute(context);
    }
    
    if (toolName === 'strategy_selector') {
      return this.strategySelector.execute(context);
    }
    
    if (toolName === 'metacognitive_calibration') {
      return this.metacognitiveCalibration.execute(context);
    }
    
    // Auto-select based on context
    const message = context.userMessage.toLowerCase();
    
    if (message.includes('problem') || message.includes('struggling') || 
        message.includes('can\'t') || message.includes('difficulty')) {
      return this.learningDiagnostic.execute(context);
    }
    
    if (message.includes('strategy') || message.includes('method') || 
        message.includes('technique') || message.includes('approach')) {
      return this.strategySelector.execute(context);
    }
    
    if (message.includes('confidence') || message.includes('know') || 
        message.includes('understand') || message.includes('awareness')) {
      return this.metacognitiveCalibration.execute(context);
    }
    
    // Default to diagnostic for problem-solving
    return this.learningDiagnostic.execute(context);
  }
}