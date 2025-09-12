import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { getFeatureFlags, getModelString, getModelCost } from '../config/feature-flags';

export interface IntentRouteResult {
  primaryIntent: string;
  secondaryIntents?: string[];
  depth: 'surface' | 'guided' | 'deep';
  suggestedTool: string;
  needsRetrieval?: boolean;
  confidence: number;
  reasoning?: string;
  modelUsed?: string; // Track which model was used
  fallbackTriggered?: boolean; // Track if fallback was used
  estimatedCost?: number; // Track cost for monitoring
  _raw?: any; // Raw LLM response for debugging
}

export class IntentRouterTool {
  private intentToolMap: Record<string, Record<string, string>>;
  private routeCache: Map<string, { result: IntentRouteResult; timestamp: number }>;
  private metrics: {
    totalRoutes: number;
    fallbackCount: number;
    cacheHits: number;
    totalCost: number;
  };
  
  constructor() {
    this.routeCache = new Map();
    this.metrics = {
      totalRoutes: 0,
      fallbackCount: 0,
      cacheHits: 0,
      totalCost: 0
    };
    // 2D Intent Matrix mapping intents and depths to tools
    this.intentToolMap = {
      'understand': {
        'surface': 'quick_answer',
        'guided': 'socratic_tool',
        'deep': 'concept_mapper'
      },
      'create': {
        'surface': 'writing_assistant',
        'guided': 'project_ideation_tool',
        'deep': 'creative_exploration_tool'
      },
      'solve': {
        'surface': 'problem_solver',
        'guided': 'socratic_tool',
        'deep': 'breakthrough_tool'
      },
      'evaluate': {
        'surface': 'evaluator_tool',
        'guided': 'review_tool',
        'deep': 'critical_analysis_tool'
      },
      'organize': {
        'surface': 'plan_manager',
        'guided': 'plan_manager',
        'deep': 'plan_manager'
      },
      'regulate': {
        'surface': 'focus_session',
        'guided': 'emotional_regulation_tool',
        'deep': 'breakthrough_tool'
      },
      'explore': {
        'surface': 'genealogy_tool',
        'guided': 'socratic_tool',
        'deep': 'creative_exploration_tool'
      },
      'interact': {
        'surface': 'peer_connector',
        'guided': 'socratic_tool',
        'deep': 'debate_moderator'
      }
    };
  }
  
  async routeIntent(query: string, context?: any): Promise<IntentRouteResult> {
    const flags = getFeatureFlags();
    const { intentRouter } = flags;
    
    // Check cache first if enabled
    if (intentRouter.cacheEnabled) {
      const cached = this.getCachedRoute(query);
      if (cached) {
        this.metrics.cacheHits++;
        return cached;
      }
    }
    
    this.metrics.totalRoutes++;
    
    const systemPrompt = `You are an intent router for an educational AI system.
    
Analyze the user's query and determine:
1. Primary learning intent (understand, create, solve, evaluate, organize, regulate, explore, interact)
2. Any secondary intents if present
3. Engagement depth (surface: <2min quick answer, guided: 5-15min learning, deep: 15+ min exploration)
4. Confidence level (0-1) - BE PRECISE with confidence scoring
5. Brief reasoning for your classification

Intent Definitions:
- understand: Seeking knowledge or comprehension
- create: Building, writing, or producing something
- solve: Working through problems or challenges
- evaluate: Assessing, reviewing, or making decisions
- organize: Planning, structuring, or managing
- regulate: Managing emotions, focus, or motivation
- explore: Open-ended discovery or investigation
- interact: Collaboration or discussion needs

Return JSON with format:
{
  "primaryIntent": "string",
  "secondaryIntents": ["string"],
  "depth": "surface|guided|deep",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

    try {
      // First attempt with primary model
      const primaryModelString = getModelString(intentRouter.primary);
      const inputTokens = Math.ceil(systemPrompt.length / 4) + Math.ceil(query.length / 4);
      
      const { text: primaryText } = await generateText({
        model: this.getModel(intentRouter.primary),
        system: systemPrompt,
        prompt: `Query: "${query}"\nContext: ${JSON.stringify(context || {})}`,
        temperature: intentRouter.primary.temperature || 0.3
      });
      
      const primaryResult = JSON.parse(primaryText);
      const outputTokens = Math.ceil(primaryText.length / 4);
      let estimatedCost = getModelCost(primaryModelString, inputTokens, outputTokens);
      
      // Check if we should use fallback
      const confidence = primaryResult.confidence || 0.7;
      let finalResult = primaryResult;
      let modelUsed = primaryModelString;
      let fallbackTriggered = false;
      
      if (intentRouter.enableFallback && confidence < intentRouter.fallbackConfidenceThreshold) {
        // Use fallback model for low confidence
        console.log(`[IntentRouter] Confidence ${confidence} below threshold ${intentRouter.fallbackConfidenceThreshold}, using fallback`);
        
        try {
          const fallbackModelString = getModelString(intentRouter.fallback);
          const { text: fallbackText } = await generateText({
            model: this.getModel(intentRouter.fallback),
            system: systemPrompt + '\n\nNote: The initial classification had low confidence. Please provide a careful analysis.',
            prompt: `Query: "${query}"\nContext: ${JSON.stringify(context || {})}\n\nInitial classification (low confidence):\n${JSON.stringify(primaryResult)}`,
            temperature: intentRouter.fallback.temperature || 0.3
          });
          
          finalResult = JSON.parse(fallbackText);
          const fallbackOutputTokens = Math.ceil(fallbackText.length / 4);
          estimatedCost += getModelCost(fallbackModelString, inputTokens + 100, fallbackOutputTokens);
          modelUsed = fallbackModelString;
          fallbackTriggered = true;
          this.metrics.fallbackCount++;
        } catch (fallbackError) {
          console.error('[IntentRouter] Fallback failed, using primary result:', fallbackError);
          // Keep primary result if fallback fails
        }
      }
      
      // Get suggested tool based on intent and depth
      const suggestedTool = this.selectToolForIntent(
        finalResult.primaryIntent || 'understand',
        finalResult.depth || 'guided'
      );
      
      // Track cost
      this.metrics.totalCost += estimatedCost;
      
      const routeResult: IntentRouteResult = {
        primaryIntent: finalResult.primaryIntent || 'understand',
        secondaryIntents: finalResult.secondaryIntents,
        depth: finalResult.depth || 'guided',
        suggestedTool,
        needsRetrieval: this.estimateRetrievalNeed(query, finalResult.primaryIntent || 'understand', finalResult.depth || 'guided'),
        confidence: finalResult.confidence || confidence,
        reasoning: finalResult.reasoning,
        modelUsed,
        fallbackTriggered,
        estimatedCost,
        _raw: finalResult
      };
      
      // Cache the result if caching is enabled
      if (intentRouter.cacheEnabled) {
        this.cacheRoute(query, routeResult);
      }
      
      // Log metrics if monitoring is enabled
      if (flags.monitoring.enableMetrics) {
        console.log(`[IntentRouter Metrics] Routes: ${this.metrics.totalRoutes}, Fallbacks: ${this.metrics.fallbackCount}, Cache Hits: ${this.metrics.cacheHits}, Total Cost: $${this.metrics.totalCost.toFixed(6)}`);
      }
      
      return routeResult;
    } catch (error) {
      console.error('[IntentRouter] Error in routing:', error);
      // Fallback to basic pattern matching
      const fb = this.fallbackRoute(query);
      fb.needsRetrieval = this.estimateRetrievalNeed(query, fb.primaryIntent, fb.depth);
      return fb;
    }
  }

  private estimateRetrievalNeed(query: string, intent: string, depth: 'surface'|'guided'|'deep'): boolean {
    const q = (query || '').toLowerCase();
    // Strong retrieval indicators
    const indicators = [
      'according to', 'source', 'citation', 'paper', 'study', 'evidence',
      'who wrote', 'when was', 'definition from', 'dataset', 'reference'
    ];
    if (indicators.some(k => q.includes(k))) return true;

    // Depth-based heuristic: deep exploration often benefits from RAG
    if (['deep'].includes(depth)) return true;

    // Intent-based heuristic
    if (['evaluate', 'explore', 'create'].includes(intent)) return depth !== 'surface';

    // Default: no retrieval
    return false;
  }
  
  private getModel(config: any) {
    const modelString = getModelString(config);
    
    // Route to appropriate provider
    if (config.provider === 'openai') {
      return openai(modelString);
    } else if (config.provider === 'google') {
      return google(modelString);
    } else {
      // Default to OpenAI
      return openai('gpt-4o-mini');
    }
  }
  
  private getCachedRoute(query: string): IntentRouteResult | null {
    const flags = getFeatureFlags();
    const cached = this.routeCache.get(query);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < flags.intentRouter.cacheTTL * 1000) {
        return { ...cached.result, _cached: true } as IntentRouteResult;
      } else {
        // Cache expired
        this.routeCache.delete(query);
      }
    }
    
    return null;
  }
  
  private cacheRoute(query: string, result: IntentRouteResult): void {
    const flags = getFeatureFlags();
    
    // Limit cache size
    if (this.routeCache.size >= flags.optimization.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.routeCache.keys().next().value;
      if (firstKey) {
        this.routeCache.delete(firstKey);
      }
    }
    
    this.routeCache.set(query, {
      result,
      timestamp: Date.now()
    });
  }
  
  selectToolForIntent(intent: string, depth: string): string {
    return this.intentToolMap[intent]?.[depth] || 'socratic_tool';
  }
  
  private fallbackRoute(query: string): IntentRouteResult {
    const lowerQuery = query.toLowerCase();
    
    // Simple pattern matching for fallback
    let intent = 'understand';
    let depth: 'surface' | 'guided' | 'deep' = 'guided';
    
    // Intent detection
    if (lowerQuery.includes('write') || lowerQuery.includes('create') || lowerQuery.includes('draft')) {
      intent = 'create';
    } else if (lowerQuery.includes('solve') || lowerQuery.includes('fix') || lowerQuery.includes('debug')) {
      intent = 'solve';
    } else if (lowerQuery.includes('plan') || lowerQuery.includes('organize') || lowerQuery.includes('schedule')) {
      intent = 'organize';
    } else if (lowerQuery.includes('evaluate') || lowerQuery.includes('decide') || lowerQuery.includes('choose')) {
      intent = 'evaluate';
    } else if (lowerQuery.includes('explore') || lowerQuery.includes('discover') || lowerQuery.includes('investigate')) {
      intent = 'explore';
    } else if (lowerQuery.includes('anxious') || lowerQuery.includes('stressed') || lowerQuery.includes('focus')) {
      intent = 'regulate';
    } else if (lowerQuery.includes('discuss') || lowerQuery.includes('debate') || lowerQuery.includes('talk')) {
      intent = 'interact';
    }
    
    // Depth detection
    if (lowerQuery.includes('quick') || lowerQuery.includes('brief') || lowerQuery.includes('simple')) {
      depth = 'surface';
    } else if (lowerQuery.includes('deep') || lowerQuery.includes('detail') || lowerQuery.includes('comprehensive')) {
      depth = 'deep';
    }
    
    return {
      primaryIntent: intent,
      depth,
      suggestedTool: this.selectToolForIntent(intent, depth),
      confidence: 0.5,
      modelUsed: 'pattern-matching',
      fallbackTriggered: false,
      estimatedCost: 0
    };
  }
  
  // Get current metrics for monitoring
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.routeCache.size,
      averageCost: this.metrics.totalRoutes > 0 ? this.metrics.totalCost / this.metrics.totalRoutes : 0,
      fallbackRate: this.metrics.totalRoutes > 0 ? this.metrics.fallbackCount / this.metrics.totalRoutes : 0,
      cacheHitRate: this.metrics.totalRoutes > 0 ? this.metrics.cacheHits / this.metrics.totalRoutes : 0
    };
  }
  
  // Clear cache (useful for testing or memory management)
  clearCache() {
    this.routeCache.clear();
  }
  
  analyzeMultiIntent(query: string): string[] {
    const intents: string[] = [];
    const lowerQuery = query.toLowerCase();
    
    const intentPatterns: Record<string, string[]> = {
      'understand': ['explain', 'what is', 'how does', 'why', 'understand'],
      'create': ['write', 'create', 'build', 'make', 'design', 'draft'],
      'solve': ['solve', 'fix', 'debug', 'help me with', 'stuck on'],
      'evaluate': ['evaluate', 'review', 'assess', 'decide', 'choose', 'compare'],
      'organize': ['plan', 'organize', 'schedule', 'structure', 'manage'],
      'explore': ['explore', 'discover', 'investigate', 'research', 'find out'],
      'interact': ['discuss', 'debate', 'collaborate', 'talk about']
    };
    
    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      if (patterns.some(pattern => lowerQuery.includes(pattern))) {
        intents.push(intent);
      }
    }
    
    return intents.length > 0 ? intents : ['understand'];
  }
}
