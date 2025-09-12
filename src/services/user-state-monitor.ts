import { generateText } from 'ai';
import { modelSelection } from './model-selection';
// Using local Message type instead of importing from 'ai'
type Message = { role: 'user' | 'assistant' | 'system'; content: string };

export type SentimentType = 'positive' | 'neutral' | 'confused' | 'frustrated' | 'disengaged';
export type LearningIntent = 
  | 'understand'    // Learn, comprehend, explain (conceptual)
  | 'create'        // Write, produce, generate (productive)
  | 'solve'         // Work through, calculate, debug (procedural)
  | 'evaluate'      // Assess, compare, decide (analytical)
  | 'organize'      // Plan, schedule, structure (managerial)
  | 'regulate'      // Reflect, adjust, cope (metacognitive/emotional)
  | 'explore'       // Research, discover, browse (investigative)
  | 'interact';     // Navigate, communicate, collaborate (social/system)

export type EngagementDepth = 
  | 'surface'       // Quick answer, fact, definition (<2 min)
  | 'guided'        // Step-by-step, structured support (5-15 min)
  | 'deep';         // Philosophical, thorough exploration (15+ min)

export type ProgressionPattern = 'exploring' | 'deepening' | 'surfacing' | 'stuck';
export type TopicContinuity = 'same' | 'related' | 'new';

export interface UserState {
  sentiment: {
    type: SentimentType;
    frustrationLevel: number; // 0-1
    confidence: number; // 0-1
  };
  
  intent: {
    current: LearningIntent;
    changed: boolean;
    changeReason?: string; // "shifted from learning to writing"
  };
  
  depth: {
    current: EngagementDepth;
    requested?: EngagementDepth; // User wants different depth
    changeIndicator?: string; // "user said 'tell me more'"
  };
  
  tooling: {
    currentToolAppropriate: boolean;
    suggestedTool?: string;
    switchReason?: string;
  };
  
  dynamics: {
    turnsAtCurrentDepth: number;
    progressionPattern: ProgressionPattern;
    topicContinuity: TopicContinuity;
  };
}

export class UserStateMonitor {
  private currentState: UserState = {
    sentiment: { type: 'neutral', frustrationLevel: 0, confidence: 0 },
    intent: { current: 'understand', changed: false },
    depth: { current: 'surface' },
    tooling: { currentToolAppropriate: true },
    dynamics: { 
      turnsAtCurrentDepth: 0, 
      progressionPattern: 'exploring',
      topicContinuity: 'same'
    }
  };

  async analyzeState(
    message: string,
    conversationHistory: Message[],
    currentTool: string
  ): Promise<UserState> {
    // Quick check for obvious state changes first
    const quickCheck = this.quickStateCheck(message);
    if (quickCheck && quickCheck.sentiment?.frustrationLevel && quickCheck.sentiment.frustrationLevel >= 0.8) {
      // High frustration detected - fast path
      return { ...this.currentState, ...quickCheck };
    }

    const { model } = modelSelection.selectModel({ 
      requiresReasoning: true // This needs nuanced understanding
    });

    const systemPrompt = `Analyze the user's current state across multiple dimensions.

CURRENT STATE:
- Tool: ${currentTool}
- Previous Intent: ${this.currentState.intent.current}
- Previous Depth: ${this.currentState.depth.current}
- Turns at depth: ${this.currentState.dynamics.turnsAtCurrentDepth}

ANALYZE:

1. SENTIMENT (emotional state):
   - Type: positive, neutral, confused, frustrated, or disengaged
   - Frustration level: 0-1 scale (0.0 = none, 1.0 = very high)
   - Look for: short responses, emotional language, confusion markers, disengagement

2. LEARNING INTENT (what they want to learn/do):
   - understand: Learning concepts, seeking explanations
   - create: Writing, producing content
   - solve: Working through problems
   - evaluate: Making decisions, comparing options
   - organize: Planning, scheduling
   - regulate: Managing emotions, reflecting
   - explore: Browsing, researching
   - interact: System navigation, communication
   
   Detect if intent has CHANGED from previous.

3. ENGAGEMENT DEPTH (how deeply they want to engage):
   - surface: Quick facts, definitions, brief answers for simple, single-step questions with objective solutions (< 2 min)
   - guided: Step-by-step help, structured support for more complex topics including subjective questions (5-15 min)
   - deep: Thorough exploration, philosophical discussion of the most difficult questions (both subjective and objective) (15+ min)
   
   Look for depth change requests:
   - Deeper: "tell me more", "why", "elaborate", "explain"
   - Surface: "just tell me", "quick answer", "summary"
   - Guided: "help me", "show me how", "step by step"

4. TOOL APPROPRIATENESS:
   - Is the current tool (${currentTool}) still appropriate?
   - What tool would better serve their needs?

5. CONVERSATION DYNAMICS:
   - Is user exploring, deepening, surfacing, or stuck?
   - Is topic same, related, or completely new?

Return comprehensive JSON analysis with this exact structure:
{
  "sentiment": {
    "type": "positive|neutral|confused|frustrated|disengaged",
    "frustrationLevel": 0-1,
    "confidence": 0-1
  },
  "intent": {
    "current": "understand|create|solve|evaluate|organize|regulate|explore|interact",
    "changed": true|false,
    "changeReason": "optional string"
  },
  "depth": {
    "current": "surface|guided|deep",
    "requested": "surface|guided|deep (optional)",
    "changeIndicator": "optional string"
  },
  "tooling": {
    "currentToolAppropriate": true|false,
    "suggestedTool": "optional string",
    "switchReason": "optional string"
  },
  "dynamics": {
    "turnsAtCurrentDepth": number,
    "progressionPattern": "exploring|deepening|surfacing|stuck",
    "topicContinuity": "same|related|new"
  }
}`;

    const contextStr = conversationHistory.slice(-4)
      .map(m => `${m.role}: ${m.content.substring(0, 200)}`)
      .join('\n');

    try {
      // Set a reasonable timeout - 60 seconds for state analysis
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const { text } = await generateText({
        model,
        system: systemPrompt,
        prompt: `Recent conversation:\n${contextStr}\n\nCurrent message: "${message}"\n\nAnalyze state:`,
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
      
      // Update turn counter
      if (analysis.depth.current === this.currentState.depth.current) {
        analysis.dynamics.turnsAtCurrentDepth = this.currentState.dynamics.turnsAtCurrentDepth + 1;
      } else {
        analysis.dynamics.turnsAtCurrentDepth = 1;
      }
      
      // Store and return new state
      this.currentState = analysis;
      return analysis;
    } catch (e) {
      console.error('[UserStateMonitor] Failed to parse state:', e);
      return this.currentState; // Return previous state on error
    }
  }

  // Quick check for ONLY the most obvious state changes
  // Trust the LLM for everything else
  quickStateCheck(message: string): Partial<UserState> | null {
    const lower = message.toLowerCase();
    
    // Only check for extremely high frustration that needs immediate attention
    if (/i give up|hate this|this is impossible/i.test(message)) {
      return {
        sentiment: { 
          type: 'frustrated', 
          frustrationLevel: 0.9,
          confidence: 0.95
        }
      };
    }
    
    // Only the clearest depth requests
    if (/^just tell me|^quick answer|^tl;?dr/i.test(lower)) {
      return {
        depth: { 
          current: this.currentState.depth.current, 
          requested: 'surface',
          changeIndicator: 'User explicitly requested quick answer'
        }
      };
    }
    
    // Let the LLM handle everything else - it's much better at understanding context
    return null;
  }

  // Get the appropriate tool based on current state
  selectToolFromState(state: UserState): string {
    // 2D matrix mapping
    const toolMatrix: Record<LearningIntent, Record<EngagementDepth, string>> = {
      understand: {
        surface: 'quick_answer',
        guided: 'practical_guide', 
        deep: 'socratic_tool'
      },
      create: {
        surface: 'email_coach',
        guided: 'writing_coach',
        deep: 'writing_coach'
      },
      solve: {
        surface: 'problem_solver',
        guided: 'problem_solver',
        deep: 'problem_solver'
      },
      evaluate: {
        surface: 'evaluator_tool',
        guided: 'evaluator_tool',
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
        surface: 'quick_answer',
        guided: 'office_hours_coach',
        deep: 'office_hours_coach'
      }
    };
    
    const tool = toolMatrix[state.intent.current]?.[state.depth.current];
    
    // All V2 tools are now implemented, no fallback needed
    return tool || 'socratic_tool';
  }

  // Reset state for new conversation
  resetState(): void {
    this.currentState = {
      sentiment: { type: 'neutral', frustrationLevel: 0, confidence: 0 },
      intent: { current: 'understand', changed: false },
      depth: { current: 'surface' },
      tooling: { currentToolAppropriate: true },
      dynamics: { 
        turnsAtCurrentDepth: 0, 
        progressionPattern: 'exploring',
        topicContinuity: 'same'
      }
    };
  }

  // Get current state
  getCurrentState(): UserState {
    return this.currentState;
  }

  // Check if user needs support
  needsEmotionalSupport(state: UserState): boolean {
    return state.sentiment.frustrationLevel >= 0.6 || 
           state.sentiment.type === 'frustrated' ||
           state.sentiment.type === 'disengaged';
  }

  // Check if tool switch is needed
  needsToolSwitch(state: UserState): boolean {
    return !state.tooling.currentToolAppropriate || 
           state.intent.changed ||
           (state.depth.requested && state.depth.requested !== state.depth.current) ||
           state.dynamics.progressionPattern === 'stuck';
  }
}
