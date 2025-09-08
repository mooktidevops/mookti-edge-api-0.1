/**
 * Query Optimizer - Reduces latency through intelligent conditional processing
 */

import { EllenRequest } from './ellen-orchestrator';

export interface OptimizationDecision {
  skipContextRewrite: boolean;
  skipRetrieval: boolean;
  useCache: boolean;
  parallelizable: string[];
  reasoning: string;
}

export class QueryOptimizer {
  private queryCache: Map<string, any> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Analyze query to determine which processing steps can be skipped
   */
  analyzeQuery(request: EllenRequest): OptimizationDecision {
    const message = request.message.toLowerCase();
    const hasContext = request.context?.priorTurns && request.context.priorTurns.length > 0;
    
    // Check cache first
    const cacheKey = this.getCacheKey(request);
    const useCache = this.shouldUseCache(cacheKey);
    
    // Determine if we can skip context rewriting
    const skipContextRewrite = this.canSkipContextRewrite(message, hasContext);
    
    // Determine if we can skip retrieval
    const skipRetrieval = this.canSkipRetrieval(message);
    
    // Identify parallelizable operations
    const parallelizable = this.identifyParallelOps(request);
    
    return {
      skipContextRewrite,
      skipRetrieval,
      useCache,
      parallelizable,
      reasoning: this.explainDecision(skipContextRewrite, skipRetrieval, useCache)
    };
  }
  
  /**
   * Determine if context rewriting can be skipped
   */
  private canSkipContextRewrite(message: string, hasContext: boolean): boolean {
    // Skip if no context exists
    if (!hasContext) return true;
    
    // Skip for very simple, self-contained queries
    const selfContainedPatterns = [
      /^(what|who|when|where|why|how) (is|are|was|were) \w+\??$/i,
      /^define \w+$/i,
      /^explain \w+$/i,
      /^list \w+$/i,
      /^thank/i,
      /^(yes|no|okay|sure|got it)/i,
    ];
    
    if (selfContainedPatterns.some(p => p.test(message))) {
      return true;
    }
    
    // Skip if message already contains clear context
    const hasExplicitContext = 
      message.length > 50 || // Longer messages tend to be self-contained
      /in the (previous|last|above)/i.test(message) ||
      /as (i|we) (mentioned|discussed)/i.test(message);
    
    return hasExplicitContext;
  }
  
  /**
   * Determine if retrieval can be skipped
   */
  private canSkipRetrieval(message: string): boolean {
    // Skip retrieval for meta-conversations
    const metaPatterns = [
      /^(hi|hello|hey|goodbye|bye|thanks)/i,
      /how are you/i,
      /what can you (do|help)/i,
      /^(yes|no|okay|sure|got it)/i,
      /^nevermind/i,
      /^sorry/i,
      /^i (don't|do not) understand your (question|response)/i,
    ];
    
    if (metaPatterns.some(p => p.test(message))) {
      return true;
    }
    
    // Skip for tool-specific requests that don't need retrieval
    const noRetrievalNeeded = [
      /make flashcards/i,
      /create a (plan|schedule)/i,
      /quiz me/i,
      /test me/i,
      /help me reflect/i,
      /different (approach|way)/i,
    ];
    
    return noRetrievalNeeded.some(p => p.test(message));
  }
  
  /**
   * Identify operations that can run in parallel
   */
  private identifyParallelOps(request: EllenRequest): string[] {
    const parallel = [];
    
    // If we need both sentiment analysis and query type detection
    if (this.needsSentimentAnalysis(request.message)) {
      parallel.push('sentiment_analysis', 'query_type_detection');
    }
    
    // If multiple retrieval namespaces needed
    if (!this.canSkipRetrieval(request.message)) {
      parallel.push('multi_namespace_retrieval');
    }
    
    return parallel;
  }
  
  /**
   * Check if sentiment analysis is needed
   */
  private needsSentimentAnalysis(message: string): boolean {
    return message.length < 20 || 
           /but|though|still|hmm|okay|fine/i.test(message);
  }
  
  /**
   * Generate cache key for request
   */
  private getCacheKey(request: EllenRequest): string {
    const contextHash = request.context?.priorTurns 
      ? request.context.priorTurns.slice(-2).map(t => t.content).join('|')
      : '';
    return `${request.message.toLowerCase()}::${contextHash}`;
  }
  
  /**
   * Check if cache should be used
   */
  private shouldUseCache(cacheKey: string): boolean {
    const cached = this.queryCache.get(cacheKey);
    if (!cached) return false;
    
    const age = Date.now() - cached.timestamp;
    return age < this.CACHE_TTL;
  }
  
  /**
   * Store result in cache
   */
  cacheResult(request: EllenRequest, result: any): void {
    const cacheKey = this.getCacheKey(request);
    this.queryCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    // Clean old entries
    this.cleanCache();
  }
  
  /**
   * Get cached result
   */
  getCachedResult(request: EllenRequest): any | null {
    const cacheKey = this.getCacheKey(request);
    const cached = this.queryCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }
    
    return null;
  }
  
  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.queryCache.delete(key);
      }
    }
    
    // Also limit cache size
    if (this.queryCache.size > 100) {
      const entries = Array.from(this.queryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 20 entries
      for (let i = 0; i < 20; i++) {
        this.queryCache.delete(entries[i][0]);
      }
    }
  }
  
  /**
   * Explain optimization decision for logging
   */
  private explainDecision(
    skipContext: boolean, 
    skipRetrieval: boolean, 
    useCache: boolean
  ): string {
    const parts = [];
    
    if (useCache) parts.push('Using cached response');
    if (skipContext) parts.push('Skipping context rewrite');
    if (skipRetrieval) parts.push('Skipping retrieval');
    
    return parts.length > 0 
      ? `Optimizations: ${parts.join(', ')}`
      : 'No optimizations applied';
  }
  
  /**
   * Estimate time saved by optimizations
   */
  estimateTimeSaved(decision: OptimizationDecision): number {
    let saved = 0;
    
    if (decision.useCache) return 1800; // ~2 seconds for cached response
    if (decision.skipContextRewrite) saved += 800; // ~800ms for context rewrite
    if (decision.skipRetrieval) saved += 1200; // ~1.2s for retrieval
    if (decision.parallelizable.length > 1) {
      saved += 400 * (decision.parallelizable.length - 1); // Save time on parallel ops
    }
    
    return saved;
  }
}

// Export singleton instance
export const queryOptimizer = new QueryOptimizer();