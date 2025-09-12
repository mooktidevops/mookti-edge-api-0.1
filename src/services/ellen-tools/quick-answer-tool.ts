import { generateText } from 'ai';
import { modelSelection } from '../model-selection';

export interface QuickAnswerParams {
  message: string;
  retrievalContent?: string;
  context?: any;
}

export interface QuickAnswerResult {
  content: string;
  confidence: number;
  sources?: string[];
}

/**
 * Quick Answer Tool
 * 
 * Purpose: Provide direct, concise answers without pedagogical scaffolding
 * Use cases:
 * - Definitions ("What is photosynthesis?")
 * - Facts ("When was the French Revolution?")
 * - Formulas ("What's the quadratic formula?")
 * - Quick clarifications
 * 
 * Key difference from Socratic: NO follow-up questions, NO scaffolding
 */
export class QuickAnswerTool {
  name = 'quick_answer';
  description = 'Provides direct, concise answers to factual questions';
  
  async execute(params: QuickAnswerParams): Promise<QuickAnswerResult> {
    const { message, retrievalContent, context } = params;
    
    // Use fast model for quick answers
    const { model } = modelSelection.selectModel({ 
      requiresReasoning: false,
      complexity: 1 // Low complexity for quick facts
    });
    
    const systemPrompt = `You are a quick reference assistant providing direct, concise answers.

INSTRUCTIONS:
1. Give the DIRECT ANSWER immediately
2. Be concise - aim for 1-3 sentences for simple facts, up to a paragraph for definitions
3. NO follow-up questions
4. NO "let's explore" or "think about" language
5. NO pedagogical scaffolding
6. Include relevant formulas, dates, or key facts
7. If you don't know, say so directly

STYLE:
- Direct and factual
- Clear and concise
- No fluff or elaboration unless essential
- Like a quick reference card or encyclopedia entry

${retrievalContent ? `\nRELEVANT CONTEXT:\n${retrievalContent}` : ''}`;

    try {
      const { text } = await generateText({
        model,
        system: systemPrompt,
        prompt: message,
        temperature: 0.2, // Low temperature for factual accuracy
        maxRetries: 2
      });
      
      return {
        content: text,
        confidence: retrievalContent ? 0.9 : 0.7,
        sources: retrievalContent ? ['course_materials'] : undefined
      };
    } catch (error) {
      console.error('[QuickAnswer] Generation failed:', error);
      
      // Fallback to even simpler response
      return {
        content: "I need more specific information to provide a quick answer. Please rephrase your question.",
        confidence: 0.3
      };
    }
  }
}

export const quickAnswerTool = new QuickAnswerTool();