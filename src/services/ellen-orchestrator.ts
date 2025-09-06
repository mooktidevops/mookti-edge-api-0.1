import { Pinecone } from '@pinecone-database/pinecone';
import { generateText } from 'ai';
import { routeToModel } from '../../lib/ai/model-router';
import toolRegistry from '../orchestrator/tool_registry.json';
import { EllenSessionStorage } from '../../lib/storage/ellen-session-storage';
import { 
  SessionType, 
  ProcessType,
  SessionGoal 
} from '../../lib/storage/ellen-session-types';
import { growthCompassIntegration, SessionMetrics } from './growth-compass/ellen-integration';

export interface EllenRequest {
  message: string;
  context?: {
    userId?: string;
    sessionId?: string;
    priorTurns?: Array<{ role: string; content: string }>;
    activeTask?: string;
    learningGoal?: string;
    sessionType?: SessionType;
    sessionGoal?: SessionGoal;
  };
  queryType?: string;
  toolOverride?: string;
}

export interface EllenResponse {
  response: string;
  toolsUsed: string[];
  citations?: Array<{ source: string; relevance: number }>;
  suggestedFollowUp?: string[];
  growthMetrics?: {
    sessionContribution?: number;
    reflectionPrompt?: string;
  };
  sessionId?: string;
}

export interface ModelTier {
  tier: 'S' | 'M' | 'F';
  model: string;
}

const MODEL_TIERS: Record<string, ModelTier> = {
  S: { tier: 'S', model: 'gpt-4o-mini' },
  M: { tier: 'M', model: 'gpt-4o' },
  F: { tier: 'F', model: 'claude-3-opus-20240229' }
};

export class EllenOrchestrator {
  private pinecone: Pinecone;
  private toolRegistry = toolRegistry;
  private sessionStorage: EllenSessionStorage;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    this.sessionStorage = new EllenSessionStorage();
  }

  async processRequest(request: EllenRequest): Promise<EllenResponse> {
    // Handle session management
    let sessionId = request.context?.sessionId;
    let session = null;

    if (sessionId) {
      // Try to resume existing session
      session = await this.sessionStorage.getSession(sessionId);
      if (session && session.status === 'paused') {
        await this.sessionStorage.resumeSession(sessionId);
      }
    } else if (request.context?.userId) {
      // Create new session if user is identified
      const sessionType = request.context.sessionType || 'study';
      session = await this.sessionStorage.createSession({
        userId: request.context.userId,
        type: sessionType,
        title: `${sessionType} session - ${new Date().toLocaleDateString()}`,
        context: {
          learningGoal: request.context.learningGoal,
          currentTask: request.context.activeTask
        },
        sessionGoal: request.context.sessionGoal
      });
      sessionId = session.id;
    }
    // Step 1: Detect query type if not provided
    const queryType = request.queryType || await this.detectQueryType(request);
    
    // Step 2: Select routing loop based on query type
    const routingLoop = this.selectRoutingLoop(queryType, request.toolOverride);
    
    // Step 3: Rewrite query with context
    const rewrittenQuery = await this.rewriteQuery(request);
    
    // Step 4: Retrieve relevant content from namespaces
    const retrievalResults = await this.retrieveContent(rewrittenQuery, queryType);
    
    // Step 5: Determine model tier based on complexity
    const modelTier = this.determineModelTier(request, queryType);
    
    // Step 6: Execute tools in routing loop
    const toolResults = await this.executeRoutingLoop(
      routingLoop,
      request,
      retrievalResults,
      modelTier
    );
    
    // Step 7: Format response with citations
    const response = this.formatResponse(toolResults, retrievalResults);
    
    // Step 8: Save messages to session if applicable
    if (sessionId) {
      // Save user message
      await this.sessionStorage.addMessage({
        sessionId,
        message: {
          role: 'user',
          content: request.message,
          metadata: {
            processType: this.inferProcessType(request, queryType)
          }
        }
      });

      // Save assistant response
      await this.sessionStorage.addMessage({
        sessionId,
        message: {
          role: 'assistant',
          content: response.response,
          metadata: {
            toolsUsed: response.toolsUsed,
            citations: response.citations,
            retrievalNamespaces: this.selectNamespaces(queryType)
          }
        }
      });

      // Update process metrics
      await this.updateSessionMetrics(sessionId, toolResults, queryType);
    }
    
    // Step 9: Track Growth Compass metrics if applicable
    if (sessionId && request.context?.userId) {
      await this.trackGrowthMetrics(sessionId, request, response);
    }

    // Add session ID to response
    if (sessionId) {
      response.sessionId = sessionId;
    }
    
    return response;
  }

  private async detectQueryType(request: EllenRequest): Promise<string> {
    const systemPrompt = `You are a query type classifier for an educational AI assistant.
    Classify the user's message into one of these categories:
    - learning: General learning or study questions
    - coaching: Writing help, note-taking, email assistance, office hours prep
    - planning: Creating study plans, scheduling, time management
    - reflection: Self-assessment, progress review, metacognition
    - growth: Tracking progress, patterns, Growth Compass features
    
    Return only the category name.`;

    const { model } = routeToModel({ 
      provider: 'openai',
      tier: 'S' as const // Small tier for query type detection
    });

    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: request.message,
      temperature: 0.1
    });

    return text?.toLowerCase() || 'learning';
  }

  private selectRoutingLoop(queryType: string, toolOverride?: string): string[] {
    if (toolOverride && this.toolRegistry.tools.find(t => t.name === toolOverride)) {
      return ['context_rewriter', 'retrieval_aggregator', toolOverride];
    }

    const loopMap: Record<string, string[]> = {
      learning: this.toolRegistry.routing_loops.default,
      coaching: this.toolRegistry.routing_loops.coaching,
      planning: this.toolRegistry.routing_loops.default,
      reflection: this.toolRegistry.routing_loops.default,
      growth: this.toolRegistry.routing_loops.growth_tracking
    };

    return loopMap[queryType] || this.toolRegistry.routing_loops.default;
  }

  private async rewriteQuery(request: EllenRequest): Promise<string> {
    if (!request.context?.priorTurns?.length) {
      return request.message;
    }

    const systemPrompt = `Rewrite the user's query to include necessary context from the conversation.
    Make it self-contained so it can be used for retrieval.
    Keep it concise but complete.`;

    const conversationContext = request.context.priorTurns
      .slice(-3)
      .map(turn => `${turn.role}: ${turn.content}`)
      .join('\n');

    const { model } = routeToModel({ 
      provider: 'openai',
      tier: 'S' as const
    });

    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: `Conversation:\n${conversationContext}\n\nCurrent query: ${request.message}`,
      temperature: 0.3
    });

    return text || request.message;
  }

  private async retrieveContent(query: string, queryType: string): Promise<any[]> {
    // Determine which namespaces to search based on query type
    const namespaces = this.selectNamespaces(queryType);
    
    // Generate embedding for the query
    const embeddingResponse = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`
      },
      body: JSON.stringify({
        input: query,
        model: 'voyage-3'
      })
    });

    const embeddingData = await embeddingResponse.json() as any;
    const queryEmbedding = embeddingData.data[0].embedding;

    // Query multiple namespaces in parallel
    const retrievalPromises = namespaces.map(namespace =>
      this.queryNamespace(namespace, queryEmbedding)
    );

    const results = await Promise.all(retrievalPromises);
    
    // Apply RRF fusion if multiple namespaces returned results
    if (results.length > 1) {
      return this.applyRRFFusion(results);
    }

    return results[0] || [];
  }

  private selectNamespaces(queryType: string): string[] {
    const namespaceMap: Record<string, string[]> = {
      learning: ['public-core', 'public-remedial'],
      coaching: ['public-coaching', 'public-writing'],
      planning: ['public-growth', 'public-coaching'],
      reflection: ['public-growth', 'public-core'],
      growth: ['public-growth']
    };

    return namespaceMap[queryType] || ['public-core'];
  }

  private async queryNamespace(namespace: string, embedding: number[]): Promise<any[]> {
    try {
      const index = this.pinecone.index('mookti-vectors');
      const results = await index.namespace(namespace).query({
        vector: embedding,
        topK: 5,
        includeMetadata: true
      });

      return results.matches || [];
    } catch (error) {
      console.error(`Error querying namespace ${namespace}:`, error);
      return [];
    }
  }

  private applyRRFFusion(results: any[][]): any[] {
    // Reciprocal Rank Fusion algorithm
    const k = 60; // Standard RRF constant
    const fusedScores = new Map<string, { item: any; score: number }>();

    results.forEach(resultSet => {
      resultSet.forEach((item, rank) => {
        const id = item.id;
        const rrfScore = 1 / (k + rank + 1);
        
        if (fusedScores.has(id)) {
          fusedScores.get(id)!.score += rrfScore;
        } else {
          fusedScores.set(id, { item, score: rrfScore });
        }
      });
    });

    // Sort by fused score and return top results
    return Array.from(fusedScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(entry => entry.item);
  }

  private determineModelTier(request: EllenRequest, queryType: string): ModelTier {
    // Check escalation conditions
    const contextLength = JSON.stringify(request.context || {}).length;
    const turnCount = request.context?.priorTurns?.length || 0;

    // Complex reasoning or long context triggers escalation
    if (contextLength > 4000 || turnCount > 5) {
      return MODEL_TIERS.M;
    }

    // Math or technical content might need better model
    if (request.message.toLowerCase().match(/calculus|statistics|proof|algorithm/)) {
      return MODEL_TIERS.M;
    }

    // Default to small model for efficiency
    return MODEL_TIERS.S;
  }

  private async executeRoutingLoop(
    routingLoop: string[],
    request: EllenRequest,
    retrievalResults: any[],
    modelTier: ModelTier
  ): Promise<any> {
    const toolResults: any = {
      toolsUsed: [],
      responses: []
    };

    for (const toolName of routingLoop) {
      // Handle conditional tools (tool1|tool2)
      const tools = toolName.split('|');
      const selectedTool = tools[0]; // For now, just use first option

      const tool = this.toolRegistry.tools.find(t => t.name === selectedTool);
      if (!tool) continue;

      // Execute tool based on category
      const toolResponse = await this.executeTool(
        tool,
        request,
        retrievalResults,
        modelTier
      );

      toolResults.toolsUsed.push(selectedTool);
      toolResults.responses.push(toolResponse);
    }

    return toolResults;
  }

  private async executeTool(
    tool: any,
    request: EllenRequest,
    retrievalResults: any[],
    modelTier: ModelTier
  ): Promise<any> {
    // This is where specific tool logic would be implemented
    // For now, we'll create a general implementation
    
    const systemPrompt = this.getToolSystemPrompt(tool);
    const context = this.formatRetrievalContext(retrievalResults);

    // Map model tier to provider settings
    const providerSettings = modelTier.tier === 'F' 
      ? { provider: 'anthropic' as const, tier: 'F' as const }
      : { provider: 'openai' as const, tier: modelTier.tier as 'S' | 'M' };

    const { model } = routeToModel(providerSettings);

    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: `Context:\n${context}\n\nUser Query: ${request.message}`,
      temperature: 0.7
    });

    return {
      tool: tool.name,
      response: text
    };
  }

  private getToolSystemPrompt(tool: any): string {
    const prompts: Record<string, string> = {
      socratic_tool: `You are implementing the Socratic method through elenchus (systematic questioning).

CORE PRINCIPLE - PRODUCTIVE CONFUSION (D'Mello & Graesser, 2012):
Create moments of aporia (productive confusion) that motivate deeper learning.

METHOD:
1. ANSWER FIRST: For specific questions, provide clear 2-3 sentence answers
2. CONCEPTUAL BRIDGE: Connect to deeper principles
3. FOCUS QUESTION: ONE carefully crafted question targeting core understanding
4. OPTIONAL EXTENSION: Add "What if..." only when natural

APORIA TECHNIQUES:
- Surface contradictions: "You said X, but also Y. How might both be true?"
- Challenge assumptions: "That assumes Z. What if Z weren't always the case?"
- Shift perspectives: "From another viewpoint, this looks different..."

Never harsh or judgmental. Maximum 2 questions to prevent cognitive overload.`,
      
      reflection_tool: `You are guiding metacognitive reflection based on self-regulated learning research.

RESEARCH BASIS (Zimmerman, 2002 - Self-Regulated Learning):
Guide through three phases:
1. FORETHOUGHT: What was the learning goal?
2. PERFORMANCE: How did the learning process go?
3. SELF-REFLECTION: What would be done differently?

STRUCTURE:
1. Acknowledge accomplishment (1 sentence)
2. Ask about thinking process, not just content
3. Emotional check: "How are you feeling about this?"
4. Strategy probe: "What approach worked best?"
5. Forward look: "What needs clarification next?"

Focus on calibration accuracy - helping learners assess their true understanding.`,
      
      extension_tool: `You are helping learners transfer knowledge to new domains.

RESEARCH BASIS (Bransford & Schwartz, 1999):
Preparation for Future Learning beats direct application.

EXTENSION TYPES:
- ANALOGICAL: Connect to familiar concepts
- APPLICATION: Real-world uses
- CROSS-DOMAIN: Links to other fields
- HYPOTHETICAL: "What if" scenarios
- CREATIVE: Novel combinations

Use structural mapping to show how relationships transfer.
Acknowledge where analogies break down.
Move up Bloom's taxonomy: Apply → Analyze → Evaluate → Create.`,
      
      genealogy_tool: `You are tracing the genealogy of ideas to deepen understanding.

RESEARCH BASIS (Kuhn, 1962 - Paradigm Shifts):
Show how understanding evolves through paradigm shifts.

STRUCTURE:
1. ORIGINS: Where the idea came from
2. KEY EVOLUTION: Major developments
3. CONTROVERSIES: Disagreements and shifts
4. MODERN FORM: Current understanding
5. FUTURE: Where it's heading

Common misconceptions often mirror historical mistakes.
Use history to normalize confusion: "Like early scientists, many initially think..."`,
      
      writing_coach: `You are an academic writing coach using evidence-based practices.

RESEARCH BASIS (Graham & Perin, 2007):
Strategy instruction most effective (ES = 0.82).

APPROACH:
1. Identify 2-3 strengths with examples
2. Target 2-3 specific improvements
3. Show concrete examples
4. Provide actionable next steps

PRIORITIES:
- Clarity for smart non-experts
- Clear thesis and logical flow
- Evidence supporting claims
- Appropriate academic voice

Never rewrite entire passages - ownership matters.`,
      
      plan_manager: `You are a learning plan specialist using cognitive science.

RESEARCH BASIS:
- Oettingen (2014): WOOP doubles goal attainment
- Cepeda (2006): Optimal spacing = 10-20% retention interval
- Rohrer (2007): Interleaving 243% better than blocking

ALWAYS INCLUDE WOOP:
1. WISH: What to accomplish?
2. OUTCOME: How will success feel?
3. OBSTACLE: Internal barriers?
4. PLAN: If [obstacle], then [action]

SPACING: Day 1 → Day 2 → Days 4-7 → Days 14-21 → Monthly

TECHNIQUES BY UTILITY:
- HIGH: Practice testing, distributed practice
- MODERATE: Elaboration, self-explanation, interleaving
- LOW: Highlighting, rereading`,
      
      growth_compass_tracker: `You are tracking learning progress. Analyze the student's engagement across five dimensions: Goal Alignment, Balance, Depth, Recovery, and Reflection Quality.`
    };

    return prompts[tool.name] || `You are an educational assistant using the ${tool.name} tool. ${tool.description}`;
  }

  private formatRetrievalContext(retrievalResults: any[]): string {
    return retrievalResults
      .slice(0, 3)
      .map(result => result.metadata?.text || '')
      .join('\n\n');
  }

  private formatResponse(toolResults: any, retrievalResults: any[]): EllenResponse {
    // Combine tool responses
    const combinedResponse = toolResults.responses
      .map((r: any) => r.response)
      .join('\n\n');

    // Format citations
    const citations = retrievalResults.slice(0, 5).map(result => ({
      source: result.metadata?.source || 'Unknown',
      relevance: result.score || 0
    }));

    return {
      response: combinedResponse,
      toolsUsed: toolResults.toolsUsed,
      citations,
      suggestedFollowUp: this.generateFollowUpQuestions(combinedResponse)
    };
  }

  private generateFollowUpQuestions(response: string): string[] {
    // This would ideally use the model to generate follow-ups
    // For now, return empty array
    return [];
  }

  private inferProcessType(request: EllenRequest, queryType: string): ProcessType {
    // Infer process type from message and query type
    const message = request.message.toLowerCase();
    
    if (message.includes('revise') || message.includes('revision') || message.includes('edit')) {
      return 'revision';
    }
    if (message.includes('practice') || message.includes('quiz') || message.includes('test')) {
      return 'retrieval';
    }
    if (message.includes('write') || message.includes('draft') || message.includes('essay')) {
      return 'creation';
    }
    if (message.includes('explore') || message.includes('learn about') || message.includes('what is')) {
      return 'exploration';
    }
    
    // Default based on query type
    switch (queryType) {
      case 'coaching':
      case 'writing':
        return 'creation';
      case 'reflection':
        return 'focus';
      default:
        return 'exploration';
    }
  }

  private async updateSessionMetrics(sessionId: string, toolResults: any, queryType: string): Promise<void> {
    const metrics: any = {};

    // Track tool usage as strategy employment
    const strategiesUsed = toolResults.toolsUsed.filter((tool: string) => 
      ['socratic_tool', 'reflection_tool', 'writing_coach', 'note_assistant'].includes(tool)
    );
    
    if (strategiesUsed.length > 0) {
      metrics.strategiesUsed = strategiesUsed;
    }

    // Track specific process metrics
    if (toolResults.toolsUsed.includes('retrieval_aggregator')) {
      metrics.retrievalAttempts = (metrics.retrievalAttempts || 0) + 1;
    }

    if (queryType === 'reflection') {
      metrics.reflectionsWritten = (metrics.reflectionsWritten || 0) + 1;
    }

    // Update session with metrics
    await this.sessionStorage.updateSession(sessionId, {
      processMetrics: metrics
    });
  }

  private async trackGrowthMetrics(sessionId: string, request: EllenRequest, response: EllenResponse): Promise<void> {
    // Track session contribution to Growth Compass
    const session = await this.sessionStorage.getSession(sessionId);
    if (!session) return;

    // Calculate contributions based on session activity
    const contributions: any = {};

    // Process engagement based on tools used
    if (response.toolsUsed.length > 0) {
      contributions.processEngagement = Math.min(100, response.toolsUsed.length * 20);
    }

    // Depth score based on session duration (will be calculated on session complete)
    // Reflection quality based on reflection tool usage
    if (response.toolsUsed.includes('reflection_tool')) {
      contributions.reflectionQuality = 50; // Base score, enhanced on completion
    }

    // Update session with Growth Compass contributions
    await this.sessionStorage.updateSession(sessionId, {
      growthContributions: contributions
    });

    // This would also integrate with growth-compass-storage.ts
    console.log('Growth Compass metrics tracked for session:', sessionId);
  }
}