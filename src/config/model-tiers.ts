/**
 * Model Tier Configuration
 * Defines our 4-tier model selection system with clear semantic meaning
 * 
 * Tier 1: Simple/Fast - High-volume, low-complexity operations
 * Tier 2: Balanced - Standard tutoring requiring nuanced understanding  
 * Tier 3: Complex & Diagnostics - Deep reasoning and problem-solving
 * Tier 4: Frontier - State-of-the-art AI for premium experiences
 */

export type ModelTier = 1 | 2 | 3 | 4;

export interface TierConfig {
  tier: ModelTier;
  name: string;
  description: string;
  primary: string;
  fallback: string;
  maxCostPerMillion: number;
  targetLatency: number; // milliseconds
  examples: string[];
}

export const MODEL_TIERS: Record<ModelTier, TierConfig> = {
  1: {
    tier: 1,
    name: 'Simple/Fast',
    description: 'High-volume, low-complexity operations requiring quick responses',
    primary: 'gemini-2.5-flash-lite',
    fallback: 'gpt-5-nano',
    maxCostPerMillion: 80,  // $0.08 output cost per M
    targetLatency: 500,
    examples: [
      'Query classification',
      'Simple Q&A',
      'Session management', 
      'Basic content extraction',
      'Pattern matching'
    ]
  },
  2: {
    tier: 2,
    name: 'Balanced',
    description: 'Standard tutoring and coaching requiring nuanced understanding',
    primary: 'gemini-2.5-flash',
    fallback: 'gpt-5-mini',
    maxCostPerMillion: 300,  // $0.30 output cost per M
    targetLatency: 1500,
    examples: [
      'Socratic questioning',
      'Writing feedback',
      'Email coaching',
      'Content generation',
      'General tutoring'
    ]
  },
  3: {
    tier: 3,
    name: 'Complex & Diagnostics',
    description: 'Tasks requiring deep reasoning, analysis, and problem-solving',
    primary: 'o4-mini',
    fallback: 'gemini-2.5-pro',
    maxCostPerMillion: 2400,  // $2.40 output cost per M
    targetLatency: 2000,
    examples: [
      'Learning diagnostics',
      'Troubleshooting',
      'Mathematical reasoning',
      'Multi-step problem solving',
      'Pattern analysis'
    ]
  },
  4: {
    tier: 4,
    name: 'Frontier',
    description: 'State-of-the-art AI for premium experiences and complex tasks',
    primary: 'gemini-2.5-pro', // Default for 'auto' selection
    fallback: 'claude-opus-4-20250514',
    maxCostPerMillion: 5000,  // $5.00 output cost per M (Gemini 2.5 Pro)
    targetLatency: 3000,
    examples: [
      'Complex agent workflows',
      'Deep research tasks',
      'Advanced curriculum development',
      'Large document analysis',
      'Multimodal reasoning'
    ]
  }
};

// Frontier models available for user selection
export const FRONTIER_MODELS = {
  'auto': 'gemini-2.5-pro',                     // Best value default
  'claude-opus-4.1': 'claude-opus-4-20250514',  // Complex agents ($75/M output)
  'gpt-5': 'gpt-5',                             // Advanced coding ($10/M output)
  'gemini-2.5-pro': 'gemini-2.5-pro'           // Large context ($5/M output)
};

// Helper functions
export function getTierConfig(tier: ModelTier): TierConfig {
  return MODEL_TIERS[tier];
}

export function getModelForTier(tier: ModelTier, useFallback: boolean = false): string {
  const config = MODEL_TIERS[tier];
  return useFallback ? config.fallback : config.primary;
}

export function getTierByComplexity(complexity: 'simple' | 'balanced' | 'complex' | 'frontier'): ModelTier {
  const mapping = {
    'simple': 1,
    'balanced': 2,
    'complex': 3,
    'frontier': 4
  };
  return mapping[complexity] as ModelTier;
}

export function shouldEscalateTier(currentTier: ModelTier, errorRate: number): boolean {
  // Escalate if error rate exceeds threshold and we're not already at frontier
  const thresholds = { 1: 0.2, 2: 0.15, 3: 0.1, 4: 0 };
  return currentTier < 4 && errorRate > thresholds[currentTier];
}