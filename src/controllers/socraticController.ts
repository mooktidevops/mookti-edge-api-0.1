import { SocraticElenchusRequest, SocraticElenchusResponse, ModelTier, ToolResponse } from '../types/ellen';
import Anthropic from '@anthropic-ai/sdk';

export class SocraticController {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }

  public async process(request: SocraticElenchusRequest, modelTier: ModelTier): Promise<ToolResponse> {
    try {
      const response = await this.generateSocraticResponse(request, modelTier);
      
      // Validate response structure
      this.validateSocraticResponse(response);
      
      return {
        tool_name: 'socratic_elenchus.v3.1',
        success: true,
        response,
        meta: {
          model_tier: modelTier,
          latency_ms: Date.now(),
        }
      };
    } catch (error) {
      return {
        tool_name: 'socratic_elenchus.v3.1',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async generateSocraticResponse(
    request: SocraticElenchusRequest, 
    modelTier: ModelTier
  ): Promise<SocraticElenchusResponse> {
    const systemPrompt = this.buildSystemPrompt(request);
    const userPrompt = this.buildUserPrompt(request);
    
    const model = this.getModelForTier(modelTier);
    
    const completion = await this.anthropic.messages.create({
      model,
      max_tokens: 1500,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = completion.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from model');
    }

    return this.parseModelResponse(content.text, request);
  }

  private buildSystemPrompt(request: SocraticElenchusRequest): string {
    return `You are Ellen, a Socratic tutor focused on formative learning. Your approach:

CORE PRINCIPLES:
1. ANSWER FIRST if the question is specific (2-5 sentences when appropriate)
2. Ask exactly ONE focused question and ONE extension question
3. Optional: Include an assumption probe only if misconceptions are detected
4. Use gentle, encouraging tone - never harsh or judgmental
5. Ground responses in citations when factual content is involved

FORMATIVE ONLY:
- Never provide grades, scores, or pass/fail judgments
- Focus on evidence of understanding and next steps
- Provide feedback as feed-up (goal), feed-back (progress), feed-forward (next steps)

SOCRATIC METHOD v3.1:
- Lead with the answer when the user asks something specific
- Your focus question should target the core concept
- Your extension question should broaden or deepen understanding
- Include hints only when the user seems stuck
- Show empathy when frustration/anxiety signals are detected

GROUNDING REQUIREMENT: ${request.policy.grounding_required ? 'Always cite sources inline [1]' : 'Citations optional'}
MAX QUESTIONS: ${request.policy.max_questions}
GENTLE CHALLENGE: ${request.policy.gentle_challenge}`;
  }

  private buildUserPrompt(request: SocraticElenchusRequest): string {
    let prompt = `User says: "${request.user_utterance}"`;
    
    if (request.context) {
      prompt += `\n\nContext:`;
      if (request.context.topic_id) prompt += `\n- Topic: ${request.context.topic_id}`;
      if (request.context.domain) prompt += `\n- Domain: ${request.context.domain}`;
      if (request.context.exam_prep) prompt += `\n- Preparing for exam`;
    }
    
    if (request.retrieval?.snippets && request.retrieval.snippets.length > 0) {
      prompt += `\n\nRelevant information:`;
      request.retrieval.snippets.forEach((snippet, i) => {
        prompt += `\n[${i + 1}] ${snippet.text} (Source: ${snippet.citation})`;
      });
    }
    
    if (request.emotion_signals && request.emotion_signals.length > 0) {
      prompt += `\n\nDetected emotions: ${request.emotion_signals.join(', ')}`;
    }
    
    prompt += `\n\nGenerate a Socratic response following the v3.1 format.`;
    
    return prompt;
  }

  private parseModelResponse(text: string, request: SocraticElenchusRequest): SocraticElenchusResponse {
    // Parse the model's response into structured format
    // This is a simplified parser - in production, use more robust parsing
    
    const response: SocraticElenchusResponse = {
      focus_question: '',
      evidence_tags: [],
      meta: {
        model_tier: 'S'
      }
    };

    // Extract answer if present (for answer-first approach)
    const answerMatch = text.match(/ANSWER:\s*(.*?)(?=FOCUS QUESTION:|$)/s);
    if (answerMatch && request.policy.answer_first_if_specific) {
      response.answer = answerMatch[1].trim();
    }

    // Extract focus question (required)
    const focusMatch = text.match(/FOCUS QUESTION:\s*(.*?)(?=EXTENSION:|ASSUMPTION:|FEEDBACK:|$)/s);
    if (focusMatch) {
      response.focus_question = focusMatch[1].trim();
    } else {
      // Fallback: use first question in response
      const questionMatch = text.match(/.*\?/);
      response.focus_question = questionMatch ? questionMatch[0] : 'Can you elaborate on your understanding?';
    }

    // Extract extension question
    const extensionMatch = text.match(/EXTENSION:\s*(.*?)(?=ASSUMPTION:|FEEDBACK:|$)/s);
    if (extensionMatch) {
      response.extension_question = extensionMatch[1].trim();
    }

    // Extract assumption probe if present
    const assumptionMatch = text.match(/ASSUMPTION PROBE:\s*(.*?)(?=FEEDBACK:|$)/s);
    if (assumptionMatch) {
      response.assumption_probe = assumptionMatch[1].trim();
    }

    // Add feedback if present
    const feedbackMatch = text.match(/FEEDBACK:\s*(.*?)$/s);
    if (feedbackMatch) {
      response.feedback = {
        feed_up: 'Understanding the concept',
        feed_back: 'Current progress noted',
        feed_forward: feedbackMatch[1].trim()
      };
    }

    // Add empathy for emotional signals
    if (request.emotion_signals?.includes('frustrated') || request.emotion_signals?.includes('anxious')) {
      response.empathy = "I understand this can be challenging. Let's work through it step by step.";
    }

    // Add citations if grounding is required
    if (request.policy.grounding_required && request.retrieval?.citations) {
      response.citations = request.retrieval.citations;
    }

    return response;
  }

  private validateSocraticResponse(response: SocraticElenchusResponse): void {
    // Ensure required fields are present
    if (!response.focus_question) {
      throw new Error('Socratic response must include a focus question');
    }

    // Ensure max questions constraint
    let questionCount = 1; // focus question
    if (response.extension_question) questionCount++;
    if (response.assumption_probe) questionCount++;
    
    if (questionCount > 2) {
      // Remove assumption probe if over limit
      delete response.assumption_probe;
    }

    // Ensure no reflection prompts
    const reflectionPhrases = ['reflect on', 'think about how', 'consider why you'];
    const allText = [
      response.focus_question,
      response.extension_question,
      response.assumption_probe
    ].filter(Boolean).join(' ').toLowerCase();
    
    if (reflectionPhrases.some(phrase => allText.includes(phrase))) {
      console.warn('Reflection prompts detected and should be avoided');
    }
  }

  private getModelForTier(tier: ModelTier): string {
    switch (tier) {
      case 'S':
        return 'claude-3-5-haiku-20241022'; // Haiku 3.5 for small tasks
      case 'M':
        return 'claude-3-5-haiku-20241022'; // Still use Haiku for medium (cost-effective)
      case 'L':
        return 'claude-3-5-sonnet-20241022'; // Sonnet 4 for large tasks
      case 'F':
        return 'claude-3-5-sonnet-20241022'; // Sonnet 4 as frontier model
      default:
        return 'claude-3-5-haiku-20241022';
    }
  }
}