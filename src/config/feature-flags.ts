/**
 * Feature Flags Configuration for Mookti Edge API
 * Centralized configuration for model selection and system behavior
 * 
 * @module feature-flags
 * @updated 2025-01-10
 */

export interface ModelConfig {
  provider: string;
  modelId: string;
  maxTokens?: number;
  temperature?: number;
}

export interface IntentRouterConfig {
  primary: ModelConfig;
  fallback: ModelConfig;
  fallbackConfidenceThreshold: number;
  enableFallback: boolean;
  cacheEnabled: boolean;
  cacheTTL: number; // seconds
}

export interface TierModelConfig {
  tier1: ModelConfig; // Simple/Fast tasks
  tier2: ModelConfig; // Balanced tasks
  tier3: ModelConfig; // Complex & Diagnostics
  tier4: ModelConfig; // Frontier Reasoning
}

export interface FeatureFlags {
  intentRouter: IntentRouterConfig;
  tierModels: TierModelConfig;
  monitoring: {
    enableMetrics: boolean;
    enableCostTracking: boolean;
    enableAccuracyTracking: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  optimization: {
    enableQueryCache: boolean;
    enablePatternCaching: boolean;
    enablePreWarming: boolean;
    maxCacheSize: number;
  };
  experimental: {
    enableMultiToolOrchestration: boolean;
    enableStateMonitor: boolean;
    enableAdaptiveThresholds: boolean;
  };
}

/**
 * Production Feature Flags Configuration
 * Based on cost analysis from 2025-01-10
 */
export const FEATURE_FLAGS: FeatureFlags = {
  intentRouter: {
    primary: {
      provider: 'openai',
      modelId: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 150
    },
    fallback: {
      provider: 'google',
      modelId: 'gemini-2.5-pro',
      temperature: 0.3,
      maxTokens: 150
    },
    fallbackConfidenceThreshold: 0.65, // Based on analysis: triggers on ~15-20% of queries
    enableFallback: true,
    cacheEnabled: true,
    cacheTTL: 300 // 5 minutes
  },

  tierModels: {
    // Tier 1: Simple/Fast Tasks - Ultra low cost
    tier1: {
      provider: 'google',
      modelId: 'gemini-2.5-flash-lite',
      temperature: 0.5,
      maxTokens: 500
    },
    
    // Tier 2: Balanced Tasks - Good performance/cost ratio
    tier2: {
      provider: 'google',
      modelId: 'gemini-2.5-flash',
      temperature: 0.7,
      maxTokens: 1000
    },
    
    // Tier 3: Complex & Diagnostics - Higher reasoning capability
    tier3: {
      provider: 'openai',
      modelId: 'gpt-4o-mini', // Using 4o-mini instead of O4-mini (not available)
      temperature: 0.5,
      maxTokens: 2000
    },
    
    // Tier 4: Frontier Reasoning - Best available model
    tier4: {
      provider: 'google',
      modelId: 'gemini-2.5-pro',
      temperature: 0.7,
      maxTokens: 4000
    }
  },

  monitoring: {
    enableMetrics: true,
    enableCostTracking: true,
    enableAccuracyTracking: true,
    logLevel: 'info'
  },

  optimization: {
    enableQueryCache: true,
    enablePatternCaching: true,
    enablePreWarming: false, // Disable for now to reduce complexity
    maxCacheSize: 1000 // Maximum cached items
  },

  experimental: {
    enableMultiToolOrchestration: true, // V2 feature
    enableStateMonitor: true, // V2 feature
    enableAdaptiveThresholds: false // Future enhancement
  }
};

/**
 * Development/Testing Override Configuration
 * Use environment variables to override in development
 */
export const getFeatureFlags = (): FeatureFlags => {
  const flags = { ...FEATURE_FLAGS };
  
  // Allow environment variable overrides
  if (process.env.INTENT_ROUTER_PRIMARY_MODEL) {
    flags.intentRouter.primary.modelId = process.env.INTENT_ROUTER_PRIMARY_MODEL;
  }
  
  if (process.env.INTENT_ROUTER_FALLBACK_MODEL) {
    flags.intentRouter.fallback.modelId = process.env.INTENT_ROUTER_FALLBACK_MODEL;
  }
  
  if (process.env.INTENT_ROUTER_CONFIDENCE_THRESHOLD) {
    flags.intentRouter.fallbackConfidenceThreshold = parseFloat(process.env.INTENT_ROUTER_CONFIDENCE_THRESHOLD);
  }
  
  if (process.env.DISABLE_INTENT_ROUTER_FALLBACK === 'true') {
    flags.intentRouter.enableFallback = false;
  }
  
  // Tier model overrides
  if (process.env.TIER1_MODEL) {
    flags.tierModels.tier1.modelId = process.env.TIER1_MODEL;
  }
  
  if (process.env.TIER2_MODEL) {
    flags.tierModels.tier2.modelId = process.env.TIER2_MODEL;
  }
  
  if (process.env.TIER3_MODEL) {
    flags.tierModels.tier3.modelId = process.env.TIER3_MODEL;
  }
  
  if (process.env.TIER4_MODEL) {
    flags.tierModels.tier4.modelId = process.env.TIER4_MODEL;
  }
  
  return flags;
};

/**
 * Helper to get model configuration string for AI SDK
 */
export const getModelString = (config: ModelConfig): string => {
  // Map provider-specific model IDs to Vercel AI SDK format
  const modelMap: Record<string, string> = {
    // OpenAI models
    'openai:gpt-4o': 'gpt-4o',
    'openai:gpt-4o-mini': 'gpt-4o-mini',
    'openai:gpt-5': 'gpt-5',
    'openai:gpt-5-mini': 'gpt-5-mini',
    
    // Google models
    'google:gemini-2.5-pro': 'gemini-1.5-pro', // Map to actual available model
    'google:gemini-2.5-flash': 'gemini-1.5-flash',
    'google:gemini-2.5-flash-lite': 'gemini-1.5-flash-8b', // Map to 8B variant
    
    // Anthropic models
    'anthropic:claude-3-5-haiku': 'claude-3-5-haiku-20241022',
    'anthropic:claude-sonnet-4': 'claude-3-5-sonnet-20241022'
  };
  
  const key = `${config.provider}:${config.modelId}`;
  return modelMap[key] || config.modelId;
};

/**
 * Cost tracking helper
 */
export const getModelCost = (modelId: string, inputTokens: number, outputTokens: number): number => {
  // Cost per million tokens (input/output)
  const costs: Record<string, { input: number; output: number }> = {
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-5-mini': { input: 0.25, output: 2.00 },
    'gpt-5': { input: 1.25, output: 10.00 },
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-1.5-flash-8b': { input: 0.02, output: 0.08 },
    'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 }
  };
  
  const cost = costs[modelId] || { input: 1.00, output: 1.00 };
  return (inputTokens * cost.input + outputTokens * cost.output) / 1_000_000;
};

export default getFeatureFlags;