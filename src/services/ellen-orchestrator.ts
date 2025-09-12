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
import { ellenTools, ELLEN_TOOLS } from './ellen-tools';
import { getToolConfig, toolNeedsRetrieval, getToolContextStrategy } from '../config/tool-config';
import { ContextManager } from './context-manager';
import { modelSelection } from './model-selection';
import { queryOptimizer } from './query-optimizer';
import { topicRegistry } from './topic-interest-registry';
import { UserStateMonitor, type UserState } from './user-state-monitor';
import { StateAwareMultiToolOrchestrator, MultiToolOptimizer } from './multi-tool-orchestrator';
import { IntentRouterTool } from './intent-router-tool';

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
  toolOverride?: string;
  modelPreference?: string; // 'auto' or specific model ID
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
  // Dev/observability
  model?: string;
  debugTrace?: any;
}

// Model tier configuration moved to ../config/model-tiers.ts
// Using new 1/2/3/4 tier system

export class EllenOrchestrator {
  private pinecone: Pinecone | null = null;
  private pineconeAvailable: boolean = false;
  private voyageAvailable: boolean = false;
  private toolRegistry = toolRegistry;
  private sessionStorage: EllenSessionStorage;
  private contextManager: ContextManager;
  private stateMonitor: UserStateMonitor;
  private multiToolOrchestrator: StateAwareMultiToolOrchestrator;
  private multiToolOptimizer: MultiToolOptimizer;
  private intentRouter: IntentRouterTool;
  private queryOptimizationHints: any = {};
  private currentTool: string = 'socratic_tool';
  private currentRequest: EllenRequest | null = null;
  private previousState: UserState | undefined;

  constructor() {
    const apiKey = process.env.PINECONE_API_KEY;
    if (apiKey && apiKey !== 'YOUR_PINECONE_API_KEY_HERE') {
      try {
        this.pinecone = new Pinecone({ apiKey });
        this.pineconeAvailable = true;
      } catch (e) {
        console.warn('[Ellen] Pinecone unavailable, skipping retrieval:', (e as any)?.message || e);
        this.pinecone = null;
        this.pineconeAvailable = false;
      }
    } else {
      console.warn('[Ellen] PINECONE_API_KEY missing; retrieval will be skipped');
      this.pinecone = null;
      this.pineconeAvailable = false;
    }

    // Check Voyage embeddings availability
    const voyageKey = process.env.VOYAGE_API_KEY;
    if (voyageKey && voyageKey !== 'YOUR_VOYAGE_API_KEY_HERE') {
      this.voyageAvailable = true;
    } else {
      console.warn('[Ellen] VOYAGE_API_KEY missing; retrieval will be skipped');
      this.voyageAvailable = false;
    }

    this.sessionStorage = new EllenSessionStorage();
    this.contextManager = new ContextManager();
    this.stateMonitor = new UserStateMonitor();
    this.intentRouter = new IntentRouterTool();
    this.multiToolOptimizer = new MultiToolOptimizer();
    this.multiToolOrchestrator = new StateAwareMultiToolOrchestrator(
      this.intentRouter,
      queryOptimizer,
      this.contextManager,
      ellenTools as any
    );
  }

  async processRequest(request: EllenRequest): Promise<EllenResponse> {
    const startTime = Date.now();
    
    // Store current request for tool selection
    this.currentRequest = request;
    
    // Step 0: Check cache and optimization opportunities
    const optimization = queryOptimizer.analyzeQuery(request);
    console.log(`[Optimizer] ${optimization.reasoning}`);
    
    // Return cached result if available
    if (optimization.useCache) {
      const cached = queryOptimizer.getCachedResult(request);
      if (cached) {
        console.log(`[Cache] Returning cached response (saved ${Date.now() - startTime}ms)`);
        return cached;
      }
    }
    
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
    
    // Reset optimization hints for new request
    this.queryOptimizationHints = {};
    
    // Ensure we don't attempt retrieval if vector store is unavailable
    if (!this.pineconeAvailable || !this.voyageAvailable) {
      this.queryOptimizationHints.skipRetrieval = true;
    }

    // Determine if this is the first turn (no prior conversation)
    const conversationHistory = request.context?.priorTurns?.map(turn => ({
      role: turn.role as 'user' | 'assistant' | 'system',
      content: turn.content
    })) || [];
    const isFirstTurn = conversationHistory.length === 0;
    
    // Step 1: INITIAL ROUTING
    // For first turn: use Intent Router to pick the primary tool
    // For subsequent turns: analyze user state to drive routing/switches
    let userState: UserState | undefined = undefined;
    if (isFirstTurn) {
      const route = await this.intentRouter.routeIntent(request.message, {
        sessionType: request.context?.sessionType,
        learningGoal: request.context?.learningGoal,
        activeTask: request.context?.activeTask,
      });
      this.currentTool = route.suggestedTool || 'socratic_tool';
      console.log('[IntentRouter] First turn tool:', this.currentTool, 'intent:', route.primaryIntent, 'depth:', route.depth, 'confidence:', route.confidence);
    } else {
      userState = await this.stateMonitor.analyzeState(
        request.message,
        conversationHistory,
        this.currentTool
      );
    }
    
    // Log state for debugging
    if (userState) {
      console.log('[UserState]', {
        sentiment: userState.sentiment.type,
        frustration: userState.sentiment.frustrationLevel,
        intent: userState.intent.current,
        depth: userState.depth.current,
        toolSwitch: userState.tooling.suggestedTool,
        progression: userState.dynamics.progressionPattern
      });
    }
    
    // Check if multi-tool orchestration is needed based on state changes
    const needsMultiTool = userState ? this.shouldUseMultiTool(userState, this.previousState) : false;
    
    if (needsMultiTool) {
      // Pre-warm predicted tools for better performance
      const predictedTools = this.multiToolOptimizer.predictNextTools(
        sessionId || 'anonymous',
        userState,
        []
      );
      await this.multiToolOptimizer.preWarmTools(predictedTools, {
        intent: userState.intent.current,
        depth: userState.depth.current
      });
      
      // Use multi-tool orchestrator
      const multiResult = await this.multiToolOrchestrator.orchestrate(
        request.message,
        userState,
        this.previousState,
        sessionId
      );
      
      // Record pattern for future optimization
      if (sessionId) {
        this.multiToolOptimizer.recordPattern(sessionId, multiResult.pattern);
      }
      
      // Store current state for next turn
      this.previousState = userState;
      
      // Format multi-tool response
      const resp = this.formatMultiToolResponse(multiResult, sessionId);
      // Attach lightweight debug info for dev observability
      try {
        (resp as any).debugTrace = {
          multiTool: true,
          pattern: multiResult?.pattern,
          state: userState ? {
            sentiment: userState.sentiment,
            intent: userState.intent,
            depth: userState.depth,
            tooling: userState.tooling,
          } : undefined,
          infrastructure: {
            pineconeAvailable: this.pineconeAvailable,
            voyageAvailable: this.voyageAvailable,
            pineconeIndex: process.env.PINECONE_INDEX_NAME || 'mookti-vectors',
          }
        };
      } catch {}
      return resp;
    }
    
    // Store current state for next turn (even if not using multi-tool)
    if (userState) {
      this.previousState = userState;
    }
    
    // Build route decision (intent/depth/tool/retrieval)
    const routeDecision = await this.intentRouter.routeIntent(request.message, {
      sessionType: request.context?.sessionType,
      learningGoal: request.context?.learningGoal,
      activeTask: request.context?.activeTask,
      priorTurns: conversationHistory
    });
    if (isFirstTurn && routeDecision?.suggestedTool) {
      this.currentTool = routeDecision.suggestedTool;
    }
    
    // Handle high frustration immediately (normalize to 0–1 scale)
    const currentFrustration = userState ? this.normalizeFrustration(userState.sentiment.frustrationLevel) : 0;
    if (userState && currentFrustration >= 0.6) {
      return await this.handleFrustrationV2(request, userState, sessionId);
    }
    
    // Handle tool switch if needed (V2 improvement)
    if (userState && this.stateMonitor.needsToolSwitch(userState)) {
      const suggestedTool = userState.tooling.suggestedTool || 
                           this.stateMonitor.selectToolFromState(userState);
      console.log(`[ToolSwitch] ${this.currentTool} → ${suggestedTool} (reason: ${userState.tooling.switchReason || 'state change'})`);
      this.currentTool = suggestedTool;
    }
    
    // Step 2: Select routing loop based on state (V2: state-driven, not query-type driven)
    const routingLoop = await this.selectRoutingLoop(
      routeDecision,
      isFirstTurn ? this.currentTool : (request.toolOverride || this.currentTool),
      optimization
    );
    
    // Get actual tools (not preprocessing steps)
    const selectedTools = routingLoop.filter(t => 
      t !== 'context_rewriter' && t !== 'retrieval_aggregator'
    );
    const primaryTool = selectedTools[0] || 'socratic_tool'; // First tool is primary
    
    // Get tool configuration
    const toolConfig = getToolConfig(primaryTool);
    
    // Step 3: Get appropriate context based on tool needs
    const context = await this.contextManager.getContext(
      toolConfig.contextStrategy,
      sessionId
    );
    
    // Step 4: Conditionally rewrite query (ONLY if in routing loop)
    let rewrittenQuery = request.message;
    if (routingLoop.includes('context_rewriter')) {
      rewrittenQuery = await this.rewriteQuery(request);
      console.log(`[Context] Query rewritten (${Date.now() - startTime}ms)`);
    } else {
      console.log(`[Context] Skipped rewrite (saved ~800ms)`);
    }
    
    // Step 5: Conditionally retrieve content (ONLY if in routing loop)
    let retrievalResults = [];
    if (routingLoop.includes('retrieval_aggregator')) {
      retrievalResults = await this.retrieveContent(rewrittenQuery, routeDecision.primaryIntent || 'understand');
      console.log(`[Retrieval] Content retrieved (${Date.now() - startTime}ms)`);
    } else {
      console.log(`[Retrieval] Skipped retrieval (saved ~1200ms)`);
    }
    
    // Step 6: Use tool-specific model tier (based on primary tool)
    const modelRouting = this.getOptimalModel(primaryTool, request);
    console.log(`[Model] Selected model: ${(modelRouting.model as any)?.modelId || modelRouting.modelId || 'unknown'} for tool: ${primaryTool}`);
    
    // Step 7: Execute ONLY the tools in the routing loop (no duplicates)
    // Filter out preprocessing tools since we already handled them
    const toolsToExecute = routingLoop.filter(t => 
      t !== 'context_rewriter' && t !== 'retrieval_aggregator'
    );
    
    const toolResults = await this.executeRoutingLoop(
      toolsToExecute,
      request,
      retrievalResults,
      modelRouting
    );
    
    // Step 8: Format response with citations
    const response = this.formatResponse(toolResults, retrievalResults);
    // Attach model id and debug trace for dev
    try {
      const modelId = (modelRouting as any)?.model?.modelId || (modelRouting as any)?.modelId;
      (response as any).model = modelId;
      (response as any).debugTrace = {
        multiTool: false,
        queryType: routeDecision?.primaryIntent || 'understand',
        routingLoop,
        primaryTool,
        model: modelId,
        optimization: {
          skipContextRewrite: optimization?.skipContextRewrite,
          skipRetrieval: optimization?.skipRetrieval || this.queryOptimizationHints?.skipRetrieval,
        },
        router: {
          primaryIntent: routeDecision?.primaryIntent,
          depth: routeDecision?.depth,
          needsRetrieval: routeDecision?.needsRetrieval,
          suggestedTool: routeDecision?.suggestedTool,
        },
        state: userState ? {
          sentiment: userState.sentiment,
          intent: userState.intent,
          depth: userState.depth,
          tooling: userState.tooling,
        } : undefined,
        infrastructure: {
          pineconeAvailable: this.pineconeAvailable,
          voyageAvailable: this.voyageAvailable,
          pineconeIndex: process.env.PINECONE_INDEX_NAME || 'mookti-vectors',
        }
      };
    } catch {}
    
    // Add actual tools used to response (including preprocessing steps)
    response.toolsUsed = routingLoop;
    
    // Step 9: Save messages to session if applicable
    if (sessionId) {
      // Save user message
      await this.sessionStorage.addMessage({
        sessionId,
        role: 'user',
        content: request.message,
        metadata: {
          processType: this.inferProcessType(request, routeDecision.primaryIntent || 'understand')
        }
      });

      // Save assistant response
      await this.sessionStorage.addMessage({
        sessionId,
        role: 'assistant',
        content: response.response,
        metadata: {
          toolsUsed: selectedTools, // Use all selected tools
          citations: response.citations,
          retrievalNamespaces: this.selectNamespacesFromIntent(routeDecision.primaryIntent || 'understand', routeDecision.depth)
        }
      });

      // Update process metrics
      await this.updateSessionMetrics(sessionId, toolResults, routeDecision.primaryIntent || 'understand');
    }
    
    // Step 9: Track Growth Compass metrics if applicable
    if (sessionId && request.context?.userId) {
      await this.trackGrowthMetrics(sessionId, request, response);
    }

    // Add session ID to response
    if (sessionId) {
      response.sessionId = sessionId;
    }
    
    // Cache successful responses for simple queries
    // Be defensive on first turn where userState may be undefined
    const frustrationLevel = this.normalizeFrustration(userState?.sentiment?.frustrationLevel ?? 0);
    if (frustrationLevel < 0.3) {
      queryOptimizer.cacheResult(request, response);
    }
    
    // Log performance metrics
    const totalTime = Date.now() - startTime;
    console.log(`[Performance] Total response time: ${totalTime}ms`);
    if (totalTime < 2000) {
      console.log(`[Performance] ✅ Target latency achieved!`);
    } else {
      console.log(`[Performance] ⚠️ Latency above target (2000ms)`);
    }
    
    return response;
  }


  private async selectRoutingLoop(
    routeDecision: { primaryIntent?: string; depth?: any; needsRetrieval?: boolean; suggestedTool?: string },
    toolOverride?: string,
    optimization?: any
  ): Promise<string[]> {
    // Build routing loop based on what's actually needed
    const routingLoop: string[] = [];
    
    // Only add context_rewriter if not skipped
    if (!optimization?.skipContextRewrite) {
      routingLoop.push('context_rewriter');
    }
    
    // Only add retrieval_aggregator if not skipped
    // Check both query optimizer AND our Tier 1 model's decision
    const shouldSkipRetrieval = optimization?.skipRetrieval || this.queryOptimizationHints?.skipRetrieval;
    if (!shouldSkipRetrieval && routeDecision?.needsRetrieval) {
      routingLoop.push('retrieval_aggregator');
    }
    
    // Select the actual tool(s) to use
    if (toolOverride && this.toolRegistry.tools.find(t => t.name === toolOverride)) {
      routingLoop.push(toolOverride);
    } else {
      const message = this.currentRequest?.message || '';
      
      // Check if this query needs sophisticated tool selection
      if (this.needsAdvancedToolSelection(message, routeDecision?.primaryIntent || 'understand')) {
        // Use Tier 3 model for complex tool orchestration
        const tools = await this.selectToolsWithAI(message, routeDecision?.primaryIntent || 'understand');
        routingLoop.push(...tools);
      } else {
        // Simple cases: use rule-based selection
        const selectedTool = this.selectBestToolForQuery(routeDecision?.primaryIntent || 'understand', message);
        routingLoop.push(selectedTool);
      }
    }
    
    return routingLoop;
  }
  
  private needsAdvancedToolSelection(message: string, queryType: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Indicators of complex, multi-faceted requests
    const complexIndicators = [
      // Multiple tasks in one request
      /\band\s+(also|then|after|plus)\b/,
      /first.*then/,
      /help me.*and.*(also|then)/,
      
      // Vague or open-ended requests
      /how (do|can) i (get better|improve|succeed)/,
      /struggling with/,
      /having trouble/,
      /need help with everything/,
      /where (do|should) i start/,
      
      // Meta-learning requests
      /how (do|should) i (study|learn|approach)/,
      /best way to/,
      /strategy for/,
      
      // Requests that span multiple domains
      /prepare.*exam.*and.*write/,
      /understand.*apply.*practice/,
    ];
    
    // Check for complexity indicators
    if (complexIndicators.some(pattern => pattern.test(lowerMessage))) {
      return true;
    }
    
    // Check for ambiguous query types
    const wordCount = message.split(' ').length;
    if (queryType === 'learning' && wordCount > 15) {
      // Longer learning queries often need nuanced tool selection
      return true;
    }
    
    return false;
  }
  
  private async selectToolsWithAI(message: string, queryType: string): Promise<string[]> {
    const systemPrompt = `You are Ellen's tool selector. Analyze the student's request and select the most appropriate pedagogical tools.

Available tools:
- socratic_tool: Default for conceptual understanding through guided questioning
- reflection_tool: For metacognitive reflection and self-assessment  
- retrieval: For practice questions and testing
- extension_tool: For applying concepts to new contexts
- genealogy_tool: For exploring conceptual origins and history
- writing_coach: For essay and paper writing support
- note_assistant: For note-taking strategies
- plan_manager: For study planning with spaced practice
- focus_session: For focused work sessions
- strategy_selector: For choosing learning strategies
- problem_solver: For step-by-step problem solving
- learning_diagnostic: For identifying learning gaps

Rules:
1. Default to socratic_tool for general learning queries
2. Select multiple tools ONLY if the request clearly requires different types of support
3. Order tools from most to least important
4. Maximum 3 tools per request
5. Return tool names as a JSON array

Examples:
"What is photosynthesis?" → ["socratic_tool"]
"I don't understand calculus" → ["socratic_tool"]
"Help me study for my exam and write my paper" → ["plan_manager", "writing_coach"]
"I'm struggling with physics problems" → ["problem_solver", "socratic_tool"]`;

    // Use Tier 3 model for sophisticated reasoning
    const { model } = modelSelection.selectModel({
      tool: 'tool_selection',
      requiresReasoning: true,
      complexity: 3
    });

    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: `Query type: ${queryType}\nStudent request: ${message}\n\nSelect appropriate tools:`,
      temperature: 0.3
    });

    try {
      // Parse the JSON array of tools
      const tools = JSON.parse(text || '["socratic_tool"]');
      
      // Validate tools exist
      const validTools = tools.filter((tool: string) => 
        this.toolRegistry.tools.find(t => t.name === tool)
      );
      
      return validTools.length > 0 ? validTools : ['socratic_tool'];
    } catch (error) {
      console.error('Error parsing AI tool selection:', error);
      return ['socratic_tool']; // Fallback to Socratic
    }
  }
  
  private selectBestToolForQuery(intent: string, message: string): string {
    const lowerMessage = message.toLowerCase();
    
    // V2: CHECK WRITING FIRST (before defaulting to socratic)
    const writingIndicators = ['thesis', 'essay', 'write', 'paper', 'draft', 'edit', 'paragraph', 'introduction', 'conclusion'];
    if (writingIndicators.some(ind => lowerMessage.includes(ind))) {
      return 'writing_coach';
    }
    
    // V2: CHECK PROBLEM-SOLVING
    const problemIndicators = ['solve', 'calculate', 'work through', 'help me with', 'stuck on', 'how to solve'];
    if (problemIndicators.some(ind => lowerMessage.includes(ind))) {
      return 'problem_solver'; // Will fallback to socratic until implemented
    }
    
    // V2: PRACTICAL LEARNING (not deep Socratic)
    if (lowerMessage.includes('how do i') || 
        lowerMessage.includes('steps to') ||
        lowerMessage.includes('for my') || 
        lowerMessage.includes('course') ||
        lowerMessage.includes('assignment')) {
      return 'practical_guide'; // Will fallback to socratic until implemented
    }
    
    // V2: QUICK ANSWERS
    if (lowerMessage.includes('what is') ||
        lowerMessage.includes('define') ||
        lowerMessage.includes('when was') ||
        lowerMessage.includes('quick')) {
      return 'quick_answer'; // Will fallback to socratic until implemented
    }
    
    // Intent-specific tool selection
    switch (intent) {
      case 'coaching':
        // More specific coaching tools
        if (lowerMessage.includes('note') || lowerMessage.includes('lecture')) {
          return 'note_assistant';
        }
        if (lowerMessage.includes('email')) {
          return 'email_coach';
        }
        if (lowerMessage.includes('office hour') || lowerMessage.includes('professor')) {
          return 'office_hours_coach';
        }
        // V2: Don't default to socratic for coaching
        return 'writing_coach'; // More appropriate default for coaching
        
      case 'organize':
      case 'planning':
        if (lowerMessage.includes('focus') || lowerMessage.includes('pomodoro')) {
          return 'focus_session';
        }
        return 'plan_manager';
        
      case 'reflection':
        return 'reflection_tool';
        
      case 'growth':
        return 'growth_compass_tracker';
        
      case 'understand':
      case 'learn':
      case 'learning':
      default:
        // Practice/testing requests
        if (lowerMessage.includes('quiz me') || lowerMessage.includes('test me') || 
            lowerMessage.includes('practice questions')) {
          return 'retrieval';
        }
        
        // Explicit reflection requests
        if (lowerMessage.includes('help me reflect') || lowerMessage.includes('think about what')) {
          return 'reflection_tool';
        }
        
        // Clear application requests
        if (lowerMessage.includes('how can i apply') || lowerMessage.includes('real world example')) {
          return 'extension_tool';
        }
        
        // Specific history/origins questions
        if (lowerMessage.includes('history of') || lowerMessage.includes('origin of')) {
          return 'genealogy_tool';
        }
        
        // Explicit planning requests
        if (lowerMessage.includes('help me plan') || lowerMessage.includes('study schedule')) {
          return 'plan_manager';
        }
        
        // Explicit memory tool requests
        if (lowerMessage.includes('make flashcards') || lowerMessage.includes('help me memorize')) {
          return 'flashcard_generator';
        }
        
        // Explicit visualization requests
        if (lowerMessage.includes('concept map') || lowerMessage.includes('draw a diagram')) {
          return 'concept_mapper';
        }
        
        // DEFAULT: Use Socratic method for all general learning queries
        // This includes: "what is X?", "explain Y", "I don't understand Z", 
        // "how does A work?", "why does B happen?", etc.
        return 'socratic_tool';
    }
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

    // Use Tier 1 (Simple/Fast) for tool selection
    const { model } = modelSelection.selectModel({
      requiresReasoning: false
    });

    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: `Conversation:\n${conversationContext}\n\nCurrent query: ${request.message}`,
      temperature: 0.3
    });

    return text || request.message;
  }

  private async retrieveContent(query: string, primaryIntent: string): Promise<any[]> {
    // Determine which namespaces to search based on intent/depth
    const namespaces = this.selectNamespacesFromIntent(primaryIntent);
    
    try {
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

      if (!embeddingResponse.ok) {
        console.warn('[Retrieval] Voyage embeddings request failed:', await embeddingResponse.text());
        return [{ id: 'llm-fallback', score: 0, metadata: { text: null, source: 'LLM Knowledge Base', fallback: true } }];
      }

      const embeddingData = await embeddingResponse.json() as any;
      const queryEmbedding = embeddingData.data?.[0]?.embedding;
      if (!queryEmbedding) {
        console.warn('[Retrieval] No embedding returned; using LLM fallback');
        return [{ id: 'llm-fallback', score: 0, metadata: { text: null, source: 'LLM Knowledge Base', fallback: true } }];
      }

      // Query multiple namespaces in parallel
      const retrievalPromises = namespaces.map(namespace => this.queryNamespace(namespace, queryEmbedding));
      const results = await Promise.all(retrievalPromises);
    
    // Flatten and filter empty results
    const flatResults = results.flat().filter(r => r && r.score);
    
    if (flatResults.length === 0) {
      // No vectors found - log this as a content gap
      await topicRegistry.logMissingTopic({
        query,
        userId: this.currentRequest?.context?.userId,
        sessionId: this.currentRequest?.context?.sessionId,
        timestamp: Date.now(),
        queryType: primaryIntent,
        namespace: namespaces[0]
      });
      
      console.log(`[Retrieval] No vectors found for: "${query}" - using LLM fallback`);
      
      // Return a special marker indicating LLM fallback should be used
      return [{
        id: 'llm-fallback',
        score: 0,
        metadata: {
          text: null,
          source: 'LLM Knowledge Base',
          fallback: true
        }
      }];
    }
    
    // Apply RRF fusion if multiple namespaces returned results
    if (results.length > 1 && flatResults.length > 0) {
      return this.applyRRFFusion(results);
    }

    return flatResults;
    } catch (err) {
      console.warn('[Retrieval] Embedding/retrieval error; using LLM fallback:', (err as any)?.message || err);
      return [{ id: 'llm-fallback', score: 0, metadata: { text: null, source: 'LLM Knowledge Base', fallback: true } }];
    }
  }

  private selectNamespacesFromIntent(intent: string, depth?: any): string[] {
    const map: Record<string, string[]> = {
      understand: ['public-core', 'public-remedial'],
      solve: ['public-core', 'public-remedial'],
      explore: ['public-core'],
      create: ['public-writing', 'public-core'],
      evaluate: ['public-core', 'public-writing'],
      organize: ['public-growth', 'public-core'],
      regulate: ['public-growth'],
      interact: ['public-core']
    };
    return map[intent] || ['public-core'];
  }

  private async queryNamespace(namespace: string, embedding: number[]): Promise<any[]> {
    try {
      const indexName = process.env.PINECONE_INDEX_NAME || 'mookti-vectors';
      const index = this.pinecone!.index(indexName);
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

  private getOptimalModel(toolName: string, request: EllenRequest) {
    const toolConfig = getToolConfig(toolName);
    const message = request.message.toLowerCase();
    
    // Check for complexity indicators
    const complexityIndicators = [
      'explain in detail',
      'comprehensive',
      'step by step',
      'advanced',
      'complex',
      'elaborate'
    ];
    
    const hasComplexity = complexityIndicators.some(indicator => 
      message.includes(indicator)
    );
    
    // Build context for model selection
    const selectionContext = {
      tool: toolName,
      tokenCount: request.context?.priorTurns?.reduce((acc, turn) => 
        acc + (turn.content?.length || 0), 0) || 0,
      complexity: hasComplexity ? 1 : 0, // Adds 1 tier if complex
      userPreference: request.modelPreference,
      requiresReasoning: toolConfig.category === 'diagnostic',
      requiresCreativity: ['writing_coach', 'analogy_builder', 'extension_tool'].includes(toolName)
    };
    
    return modelSelection.selectModel(selectionContext);
  }

  private async executeRoutingLoop(
    routingLoop: string[],
    request: EllenRequest,
    retrievalResults: any[],
    modelRouting: any
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
        modelRouting
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
    modelRouting: any
  ): Promise<any> {
    // Check if this is a new Ellen tool
    const toolName = tool.name.toLowerCase().replace(/_tool$/, '');
    const isNewTool = Object.values(ELLEN_TOOLS).includes(toolName as any);
    
    if (isNewTool) {
      // Use the new EllenMasterOrchestrator
      // Model routing already provided, use it directly
      const context = this.formatRetrievalContext(retrievalResults);
      
      // Check for LLM fallback case
      const isLLMFallback = retrievalResults.length === 1 && retrievalResults[0].metadata?.fallback;
      
      const toolContext = {
        userMessage: request.message,
        priorMessages: request.context?.priorTurns,
        retrievalContext: context,
        learningGoal: request.context?.learningGoal,
        currentTopic: request.context?.activeTask,
        sessionType: request.context?.sessionType as any,
        modelRouting,
        useLLMFallback: isLLMFallback || !context
      };
      
      const result = await ellenTools.execute(
        request.message,
        toolName,
        toolContext,
        modelRouting
      );
      
      // Track tool usage for pattern analysis
      this.trackToolUse(tool.name);
      
      // Normalize response format
      if (typeof result === 'object' && 'content' in result) {
        return {
          tool: tool.name,
          response: result.content
        };
      } else if (typeof result === 'object' && 'feedback' in result) {
        return {
          tool: tool.name,
          response: result.feedback
        };
      } else if (typeof result === 'object' && 'plan' in result) {
        return {
          tool: tool.name,
          response: JSON.stringify(result.plan, null, 2)
        };
      } else if (typeof result === 'string') {
        return {
          tool: tool.name,
          response: result
        };
      } else {
        return {
          tool: tool.name,
          response: JSON.stringify(result)
        };
      }
    } else {
      // Fall back to old implementation for legacy tools
      const systemPrompt = this.getToolSystemPrompt(tool);
      const context = this.formatRetrievalContext(retrievalResults);

      // Use the provided model routing
      const { model } = modelRouting;
      
      // Check if we have context or need to use LLM's knowledge
      const isLLMFallback = retrievalResults.length === 1 && retrievalResults[0].metadata?.fallback;
      const prompt = isLLMFallback || !context
        ? `Using your knowledge, respond to: ${request.message}`
        : `Context:\n${context}\n\nUser Query: ${request.message}`;

      const { text } = await generateText({
        model,
        system: systemPrompt,
        prompt,
        temperature: 0.7
      });

      return {
        tool: tool.name,
        response: text
      };
    }
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
    // Check if this is an LLM fallback case
    if (retrievalResults.length === 1 && retrievalResults[0].metadata?.fallback) {
      return ''; // Return empty context to trigger LLM's own knowledge
    }
    
    return retrievalResults
      .slice(0, 3)
      .map(result => result.metadata?.text || '')
      .filter(text => text.length > 0)
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

  private inferProcessType(request: EllenRequest, primaryIntent: string): ProcessType {
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
    
    // Default based on primary intent
    switch (primaryIntent) {
      case 'create':
        return 'creation';
      case 'regulate':
        return 'focus';
      case 'organize':
        return 'focus';
      case 'understand':
      case 'solve':
      case 'explore':
      case 'evaluate':
      default:
        return 'exploration';
    }
  }

  private async updateSessionMetrics(sessionId: string, toolResults: any, primaryIntent: string): Promise<void> {
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

    if (toolResults.toolsUsed.includes('reflection_tool')) {
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
  
  /**
   * Analyze sentiment if indicators suggest frustration or disengagement
   */
  private async analyzeSentimentIfNeeded(request: EllenRequest): Promise<any> {
    const message = request.message.toLowerCase();
    
    // Quick checks that warrant sentiment analysis
    const needsAnalysis = 
      message.length < 20 || // Very short responses
      /but|though|still|hmm|okay|fine|whatever|nevermind/i.test(message) ||
      /\?{2,}|\.{3,}|!{2,}/i.test(message) || // Multiple punctuation
      request.context?.priorTurns?.some(turn => 
        turn.role === 'user' && turn.content.toLowerCase().includes('understand')
      );
    
    if (!needsAnalysis) {
      return null;
    }
    
    // Import and use the sentiment analysis function
    const { analyzeStudentSentiment } = await import('./ellen-tools/meta-tools');
    return await analyzeStudentSentiment(request.message, request.context?.priorTurns);
  }
  
  /**
   * Handle frustrated or confused students with empathy and alternatives
   */
  /**
   * V2: Handle frustration using comprehensive UserState
   */
  private async handleFrustrationV2(
    request: EllenRequest,
    userState: UserState,
    sessionId?: string
  ): Promise<EllenResponse> {
    const { metaTools } = await import('./ellen-tools/meta-tools');
    
    // Determine which meta-tool to use based on state
    let toolToUse;
    let toolParams;
    
    if (userState.dynamics.progressionPattern === 'stuck' && userState.dynamics.turnsAtCurrentDepth > 3) {
      // User is stuck - suggest tool switch
      toolToUse = metaTools.toolSwitchHandler;
      toolParams = {
        message: request.message,
        currentTool: this.currentTool,
        availableTools: Object.keys(ellenTools),
        reason: `You seem stuck. Current pattern: ${userState.dynamics.progressionPattern}`
      };
    } else if (this.normalizeFrustration(userState.sentiment.frustrationLevel) >= 0.8) {
      // High frustration - provide emotional support
      toolToUse = metaTools.frustrationHandler;
      toolParams = {
        message: request.message,
        previousAttempts: this.recentTools || [],
        currentTool: this.currentTool,
        frustrationLevel: this.normalizeFrustration(userState.sentiment.frustrationLevel)
      };
    } else if (userState.depth.requested && userState.depth.requested !== userState.depth.current) {
      // Depth mismatch - adjust engagement level
      toolToUse = metaTools.expectationClarifier;
      toolParams = {
        message: request.message,
        context: request.context,
        currentDepth: userState.depth.current,
        requestedDepth: userState.depth.requested,
        suggestion: `Would you like a ${userState.depth.requested} explanation instead?`
      };
    } else {
      // General clarification needed
      toolToUse = metaTools.expectationClarifier;
      toolParams = {
        message: request.message,
        context: request.context,
        userState: userState
      };
    }
    
    // Execute the meta-tool
    const result = await toolToUse.execute(toolParams);
    
    // Track this interaction
    if (sessionId) {
      await this.sessionStorage.addMessage({
        sessionId,
        role: 'assistant',
        content: result.content,
        metadata: {
          toolsUsed: [toolToUse.name],
          // Store state analysis as generic metadata
          ...{
            userStateSentiment: userState.sentiment.type,
            userStateFrustration: userState.sentiment.frustrationLevel,
            userStateIntent: userState.intent.current,
            userStateDepth: userState.depth.current
          }
        } as any
      });
    }
    
    // If tool switch was recommended, update current tool
    if (result.recommendedTool) {
      this.currentTool = result.recommendedTool;
      console.log(`[MetaTool] Switched to ${result.recommendedTool} after frustration handling`);
    }
    
    return {
      response: result.content,
      toolsUsed: [toolToUse.name],
      suggestedFollowUp: result.suggestedFollowUp
    };
  }

  /**
   * Original handleFrustration method (kept for backward compatibility)
   */
  private async handleFrustration(
    request: EllenRequest,
    sentiment: any,
    sessionId?: string
  ): Promise<EllenResponse> {
    const { metaTools } = await import('./ellen-tools/meta-tools');
    
    // Determine which meta-tool to use
    let toolToUse;
    let toolParams;
    
    if (sentiment.needsToolSwitch) {
      toolToUse = metaTools.toolSwitchHandler;
      toolParams = {
        message: request.message,
        currentTool: this.lastUsedTool || 'socratic_tool',
        availableTools: Object.keys(ellenTools)
      };
    } else if (this.normalizeFrustration(sentiment.frustrationLevel) >= 0.8) {
      toolToUse = metaTools.frustrationHandler;
      toolParams = {
        message: request.message,
        previousAttempts: this.recentTools || [],
        currentTool: this.lastUsedTool || 'socratic_tool'
      };
    } else {
      toolToUse = metaTools.expectationClarifier;
      toolParams = {
        message: request.message,
        context: request.context
      };
    }
    
    // Execute the meta-tool
    const result = await toolToUse.execute(toolParams);
    
    // Track this interaction
    if (sessionId) {
      await this.sessionStorage.addMessage({
        sessionId,
        role: 'assistant',
        content: result.content,
        metadata: {
          toolsUsed: [toolToUse.name]
        }
      });
    }
    
    // If tool switch was recommended, update for next interaction
    if (result.metadata?.switchTo) {
      this.recommendedTool = result.metadata.switchTo;
    }
    
    return {
      response: result.content,
      toolsUsed: [toolToUse.name],
      growthMetrics: {
        reflectionPrompt: "How did that approach work for you?"
      },
      sessionId
    };
  }
  
  // Track tools for pattern analysis
  private lastUsedTool?: string;
  private recentTools: string[] = [];
  private recommendedTool?: string;
  
  /**
   * Update tool tracking after each use
   */
  private trackToolUse(toolName: string) {
    this.lastUsedTool = toolName;
    this.currentTool = toolName; // V2: Update current tool for state monitor
    this.recentTools.push(toolName);
    if (this.recentTools.length > 5) {
      this.recentTools.shift();
    }
  }
  
  /**
   * Determine if multi-tool orchestration should be used
   */
  private shouldUseMultiTool(currentState: UserState, previousState?: UserState): boolean {
    // High frustration always triggers multi-tool consideration (normalize to 0–1)
    if (this.normalizeFrustration(currentState.sentiment.frustrationLevel) >= 0.7) {
      return true;
    }
    
    // Intent change with previous state
    if (previousState && currentState.intent.changed) {
      return true;
    }
    
    // Depth progression
    if (previousState && currentState.depth.changeIndicator) {
      return true;
    }
    
    // Stuck pattern
    if (currentState.dynamics.progressionPattern === 'stuck' && 
        currentState.dynamics.turnsAtCurrentDepth > 3) {
      return true;
    }
    
    // Tool ineffectiveness (suggested tool differs from current)
    if (currentState.tooling.suggestedTool && 
        typeof currentState.tooling.currentToolAppropriate === 'string' &&
        currentState.tooling.suggestedTool !== currentState.tooling.currentToolAppropriate) {
      return true;
    }
    
    return false;
  }

  // Normalize frustration to a 0–1 scale for consistent comparisons
  private normalizeFrustration(level: number): number {
    if (level == null || Number.isNaN(level as any)) return 0;
    const numeric = Number(level);
    const scaled = numeric > 1 ? numeric / 10 : numeric;
    return Math.max(0, Math.min(1, scaled));
  }
  
  /**
   * Format multi-tool orchestration result into EllenResponse
   */
  private formatMultiToolResponse(multiResult: any, sessionId?: string): EllenResponse {
    // Combine responses from all executed tools
    const combinedResponse = multiResult.executions
      .filter((e: any) => e.success && e.result)
      .map((e: any) => {
        if (typeof e.result === 'string') {
          return e.result;
        } else if (e.result.response) {
          return e.result.response;
        } else if (e.result.content) {
          return e.result.content;
        } else {
          return JSON.stringify(e.result);
        }
      })
      .join('\n\n');
    
    // Extract tool names
    const toolsUsed = multiResult.executions.map((e: any) => e.tool);
    
    // Generate follow-up suggestions based on pattern
    const suggestedFollowUp = this.generateMultiToolFollowUp(multiResult.pattern);
    
    // Log performance metrics
    console.log(`[MultiTool] Pattern: ${multiResult.pattern.type}`);
    console.log(`[MultiTool] Tools executed: ${toolsUsed.join(', ')}`);
    console.log(`[MultiTool] Total time: ${multiResult.metadata.totalExecutionTime}ms`);
    console.log(`[MultiTool] Effectiveness: ${(multiResult.metadata.patternEffectiveness * 100).toFixed(1)}%`);
    
    return {
      response: combinedResponse || "I'm having trouble processing that request. Let me try a different approach.",
      toolsUsed,
      suggestedFollowUp,
      sessionId,
      growthMetrics: {
        sessionContribution: multiResult.metadata.patternEffectiveness,
        reflectionPrompt: this.getReflectionPrompt(multiResult.pattern.type)
      }
    };
  }
  
  /**
   * Generate follow-up questions based on orchestration pattern
   */
  private generateMultiToolFollowUp(pattern: any): string[] {
    const followUpMap: Record<string, string[]> = {
      handoff: [
        "Would you like to explore this from a different angle?",
        "Should we dive deeper into any specific aspect?",
        "Is this the kind of help you were looking for?"
      ],
      parallel: [
        "Which aspect would you like to focus on next?",
        "Should we practice applying any of these concepts?",
        "Do you see how these ideas connect?"
      ],
      chain: [
        "Are you ready for the next level of complexity?",
        "Should we review any of the earlier steps?",
        "What questions do you have about the progression?"
      ],
      fallback: [
        "Is this approach working better for you?",
        "What specifically would be most helpful right now?",
        "Should we try a completely different strategy?"
      ]
    };
    
    return followUpMap[pattern.type] || ["How can I help you further?"];
  }
  
  /**
   * Get reflection prompt based on pattern type
   */
  private getReflectionPrompt(patternType: string): string {
    const reflectionMap: Record<string, string> = {
      handoff: "How did the shift in approach help your understanding?",
      parallel: "Which perspective was most valuable for you?",
      chain: "How did building up complexity help your learning?",
      fallback: "What made this approach more effective?"
    };
    
    return reflectionMap[patternType] || "How did that explanation work for you?";
  }
}
