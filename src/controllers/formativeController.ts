import { 
  FormativeCheckRequest, 
  FormativeCheckResponse,
  DiagnosticProbeRequest,
  DiagnosticProbeResponse,
  RevisionSchedulerRequest,
  RevisionSchedulerResponse,
  WorkedExampleRequest,
  WorkedExampleResponse,
  ConceptMapperRequest,
  ConceptMapperResponse,
  ModelTier 
} from '../types/ellen';
import Anthropic from '@anthropic-ai/sdk';

export class FormativeController {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }

  public async process(toolName: string, payload: any, modelTier: ModelTier): Promise<any> {
    try {
      let response: any;
      
      switch (toolName) {
        case 'formative_check_and_feedback.v3':
          response = await this.handleFormativeCheck(payload, modelTier);
          break;
        case 'diagnostic_probe_planner.v3':
          response = await this.handleDiagnosticProbe(payload, modelTier);
          break;
        case 'revision_scheduler.v1':
          response = await this.handleRevisionScheduler(payload, modelTier);
          break;
        case 'worked_example_walker.v2':
          response = await this.handleWorkedExample(payload, modelTier);
          break;
        case 'concept_mapper.v2':
          response = await this.handleConceptMapper(payload, modelTier);
          break;
        default:
          throw new Error(`Unknown formative tool: ${toolName}`);
      }

      return {
        tool_name: toolName,
        success: true,
        response,
        meta: {
          model_tier: modelTier,
          latency_ms: Date.now(),
        }
      };
    } catch (error) {
      return {
        tool_name: toolName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleFormativeCheck(
    request: FormativeCheckRequest, 
    modelTier: ModelTier
  ): Promise<FormativeCheckResponse> {
    const systemPrompt = `You are a formative assessment tool. Analyze the user's response and provide:
1. Evidence tags showing what concepts they understand
2. Feedback structured as feed-up (goal), feed-back (progress), feed-forward (next steps)
3. Identify any misconceptions without providing grades or scores

IMPORTANT: This is formative-only. Never provide grades, scores, or pass/fail judgments.`;

    const userPrompt = `Question: ${request.context?.question || 'N/A'}
User Response: ${request.user_response}
Expected Answer: ${request.expected || 'Open-ended'}
Check Type: ${request.check_type || 'conceptual'}

Provide formative feedback following the structure.`;

    const model = this.getModelForTier(modelTier);
    const completion = await this.anthropic.messages.create({
      model,
      max_tokens: 1000,
      temperature: 0.5,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = completion.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse response into structured format
    return this.parseFormativeCheckResponse(content.text);
  }

  private parseFormativeCheckResponse(text: string): FormativeCheckResponse {
    // Simple parsing - in production use more robust parsing
    const response: FormativeCheckResponse = {
      evidence_tags: [],
      feedback: {
        feed_up: '',
        feed_back: '',
        feed_forward: ''
      }
    };

    // Extract evidence tags
    const tagsMatch = text.match(/Evidence Tags?:?\s*(.*?)(?=Feed|$)/si);
    if (tagsMatch) {
      response.evidence_tags = tagsMatch[1]
        .split(/[,\n]/)
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    }

    // Extract feedback components
    const feedUpMatch = text.match(/Feed[- ]?up:?\s*(.*?)(?=Feed[- ]?back|$)/si);
    const feedBackMatch = text.match(/Feed[- ]?back:?\s*(.*?)(?=Feed[- ]?forward|$)/si);
    const feedForwardMatch = text.match(/Feed[- ]?forward:?\s*(.*?)$/si);

    response.feedback.feed_up = feedUpMatch ? feedUpMatch[1].trim() : 'Understanding the core concept';
    response.feedback.feed_back = feedBackMatch ? feedBackMatch[1].trim() : 'Progress noted';
    response.feedback.feed_forward = feedForwardMatch ? feedForwardMatch[1].trim() : 'Continue exploring';

    return response;
  }

  private async handleDiagnosticProbe(
    request: DiagnosticProbeRequest,
    modelTier: ModelTier
  ): Promise<DiagnosticProbeResponse> {
    const systemPrompt = `Create diagnostic probes to assess understanding of ${request.topic_id} in ${request.domain}.
Generate questions that reveal conceptual understanding, procedural knowledge, and boundary cases.
Level: ${request.level || 'intro'}`;

    const model = this.getModelForTier(modelTier);
    const completion = await this.anthropic.messages.create({
      model,
      max_tokens: 1500,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ 
        role: 'user', 
        content: 'Generate 3-5 diagnostic probes with varying difficulty.' 
      }],
    });

    const content = completion.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return this.parseDiagnosticProbeResponse(content.text, request);
  }

  private parseDiagnosticProbeResponse(text: string, request: DiagnosticProbeRequest): DiagnosticProbeResponse {
    // Parse the AI response into structured probes
    const probes = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.includes('?')) {
        probes.push({
          question: line.trim(),
          type: this.classifyQuestionType(line),
          difficulty: this.estimateDifficulty(request.level),
        });
      }
    }

    // Ensure we have at least 3 probes
    while (probes.length < 3) {
      probes.push({
        question: `Can you explain the key concept of ${request.topic_id}?`,
        type: 'conceptual' as const,
        difficulty: 1,
      });
    }

    return {
      probes: probes.slice(0, 5),
      coverage_map: {
        conceptual: probes.some(p => p.type === 'conceptual'),
        procedural: probes.some(p => p.type === 'procedural'),
        boundary_case: probes.some(p => p.type === 'boundary_case'),
      },
      recommended_path: [`${request.topic_id}_intro`, `${request.topic_id}_practice`],
    };
  }

  private classifyQuestionType(question: string): 'conceptual' | 'procedural' | 'boundary_case' {
    const lower = question.toLowerCase();
    if (lower.includes('how') || lower.includes('step') || lower.includes('process')) {
      return 'procedural';
    }
    if (lower.includes('edge') || lower.includes('limit') || lower.includes('special')) {
      return 'boundary_case';
    }
    return 'conceptual';
  }

  private estimateDifficulty(level?: string): number {
    switch (level) {
      case 'advanced': return 3;
      case 'intermediate': return 2;
      default: return 1;
    }
  }

  private async handleRevisionScheduler(
    request: RevisionSchedulerRequest,
    modelTier: ModelTier
  ): Promise<RevisionSchedulerResponse> {
    // Generate spaced repetition schedule
    const schedule = [];
    const topics = request.topics;
    const examDate = new Date(request.exam_date || Date.now() + 30 * 24 * 60 * 60 * 1000);
    const currentDate = new Date(request.current_date || Date.now());
    const hoursPerDay = request.study_hours_per_day || 2;

    const daysUntilExam = Math.floor((examDate.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000));
    
    // Distribute topics across days with spaced repetition
    for (let day = 0; day < daysUntilExam; day++) {
      const date = new Date(currentDate.getTime() + day * 24 * 60 * 60 * 1000);
      const topicsForDay = this.selectTopicsForDay(topics, day, daysUntilExam);
      
      if (topicsForDay.length > 0) {
        schedule.push({
          date: date.toISOString().split('T')[0],
          topics: topicsForDay,
          duration_minutes: Math.floor(hoursPerDay * 60 / topicsForDay.length) * topicsForDay.length,
          type: day < daysUntilExam / 3 ? 'new' : day < 2 * daysUntilExam / 3 ? 'review' : 'practice',
        });
      }
    }

    // Generate spaced intervals (Fibonacci-like sequence)
    const spacedIntervals: Record<string, number[]> = {};
    topics.forEach(topic => {
      spacedIntervals[topic] = [1, 3, 7, 14, 30]; // Days for review
    });

    return {
      schedule,
      spaced_intervals: spacedIntervals,
      interleaving_pattern: this.generateInterleavingPattern(topics),
    };
  }

  private selectTopicsForDay(topics: string[], day: number, totalDays: number): string[] {
    // Simple round-robin with increasing frequency near exam
    const selected = [];
    const cycleLength = Math.max(3, Math.floor(totalDays / topics.length));
    
    for (let i = 0; i < topics.length; i++) {
      if (day % cycleLength === i % cycleLength) {
        selected.push(topics[i]);
      }
    }
    
    return selected;
  }

  private generateInterleavingPattern(topics: string[]): string[] {
    // Create an interleaved pattern for mixed practice
    const pattern = [];
    const rounds = 3;
    
    for (let round = 0; round < rounds; round++) {
      for (const topic of topics) {
        pattern.push(topic);
      }
    }
    
    // Shuffle for interleaving
    return pattern.sort(() => Math.random() - 0.5);
  }

  private async handleWorkedExample(
    request: WorkedExampleRequest,
    modelTier: ModelTier
  ): Promise<WorkedExampleResponse> {
    const systemPrompt = `Create a worked example for the following problem in ${request.domain}.
Break it down into clear steps with explanations of why each step is taken.
${request.highlight_strategy ? 'Highlight the overall strategy.' : ''}`;

    const model = this.getModelForTier(modelTier);
    const completion = await this.anthropic.messages.create({
      model,
      max_tokens: 2000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ 
        role: 'user', 
        content: `Problem: ${request.problem}\nShow ${request.show_steps || 'all'} steps.` 
      }],
    });

    const content = completion.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return this.parseWorkedExampleResponse(content.text, request);
  }

  private parseWorkedExampleResponse(text: string, request: WorkedExampleRequest): WorkedExampleResponse {
    const steps = [];
    const lines = text.split('\n');
    
    let currentStep = '';
    let currentWhy = '';
    
    for (const line of lines) {
      if (line.match(/^step\s*\d+/i) || line.match(/^\d+\./)) {
        if (currentStep) {
          steps.push({ step: currentStep, why: currentWhy });
        }
        currentStep = line.replace(/^(step\s*\d+:?|\d+\.)\s*/i, '').trim();
        currentWhy = '';
      } else if (line.match(/^why:|reason:/i)) {
        currentWhy = line.replace(/^(why:|reason:)\s*/i, '').trim();
      }
    }
    
    if (currentStep) {
      steps.push({ step: currentStep, why: currentWhy || 'Logical progression' });
    }

    return {
      problem_statement: request.problem,
      steps: steps.length > 0 ? steps : [
        { step: 'Analyze the problem', why: 'Understanding requirements' },
        { step: 'Apply relevant concept', why: 'Core solution approach' },
        { step: 'Verify result', why: 'Ensure correctness' },
      ],
      strategy_highlight: request.highlight_strategy ? 'Break down complex problems into manageable steps' : undefined,
      common_errors: ['Skipping verification', 'Missing edge cases'],
      practice_variations: ['Try with different values', 'Consider boundary conditions'],
    };
  }

  private async handleConceptMapper(
    request: ConceptMapperRequest,
    modelTier: ModelTier
  ): Promise<ConceptMapperResponse> {
    // Generate concept map structure
    const nodes = [
      {
        id: 'central',
        label: request.central_concept,
        type: 'concept' as const,
      },
    ];

    const edges = [];
    
    // Add related concepts
    const relatedConcepts = this.generateRelatedConcepts(request.central_concept, request.domain);
    
    relatedConcepts.forEach((concept, i) => {
      const nodeId = `concept_${i}`;
      nodes.push({
        id: nodeId,
        label: concept.label,
        type: concept.type,
      });
      
      edges.push({
        from: 'central',
        to: nodeId,
        relationship: concept.relationship,
      });
    });

    // Add prerequisites if requested
    const prerequisites = request.include_prerequisites ? 
      this.generatePrerequisites(request.central_concept) : [];

    return {
      map: { nodes, edges },
      prerequisites,
      applications: this.generateApplications(request.central_concept),
    };
  }

  private generateRelatedConcepts(concept: string, domain?: string): any[] {
    // Simple concept generation - in production, use knowledge base
    return [
      { label: `${concept} fundamentals`, type: 'concept', relationship: 'is based on' },
      { label: `${concept} example`, type: 'example', relationship: 'illustrated by' },
      { label: `${concept} application`, type: 'application', relationship: 'applied in' },
    ];
  }

  private generatePrerequisites(concept: string): string[] {
    return [`Basic ${concept.split(' ')[0]}`, 'Foundational principles'];
  }

  private generateApplications(concept: string): string[] {
    return [`Real-world ${concept}`, `Advanced ${concept} techniques`];
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