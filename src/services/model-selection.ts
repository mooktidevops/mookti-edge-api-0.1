/**
 * Model Selection Service
 * Implements intelligent model routing based on our 4-tier system
 */

import { routeToModel, ModelRoutingResult } from '../../lib/ai/model-router';
import { ModelTier, getTierConfig, FRONTIER_MODELS } from '../config/model-tiers';
import { getToolConfig } from '../config/tool-config';

export interface ModelSelectionContext {
  tool?: string;
  tokenCount?: number;
  complexity?: number;
  userPreference?: string; // 'auto' or specific model ID
  errorCount?: number;
  requiresReasoning?: boolean;
  requiresCreativity?: boolean;
}

export class ModelSelectionService {
  /**
   * Select the optimal model based on tool, context, and user preferences
   */
  public selectModel(context: ModelSelectionContext): ModelRoutingResult {
    console.log(`[ModelSelection] Input context:`, {
      tool: context.tool,
      tokenCount: context.tokenCount,
      complexity: context.complexity,
      requiresReasoning: context.requiresReasoning,
      requiresCreativity: context.requiresCreativity
    });

    // 1. Handle explicit user selection for frontier models
    if (context.userPreference && context.userPreference !== 'auto') {
      console.log(`[ModelSelection] User preference override: ${context.userPreference}`);
      return this.selectFrontierModel(context.userPreference);
    }

    // 2. Handle 'auto' frontier selection
    if (context.userPreference === 'auto') {
      console.log(`[ModelSelection] Auto frontier selection → gemini-2.5-pro`);
      return this.selectFrontierModel('gemini-2.5-pro');
    }

    // 3. Get tool-based tier if tool is specified
    let tier: ModelTier = 2; // Default to balanced
    if (context.tool) {
      const toolConfig = getToolConfig(context.tool);
      tier = toolConfig.modelTier;
      console.log(`[ModelSelection] Tool '${context.tool}' → base tier ${tier}`);
    } else {
      console.log(`[ModelSelection] No tool specified → default tier 2`);
    }

    // 4. Apply context-based optimizations
    const originalTier = tier;
    tier = this.optimizeTierForContext(tier, context);
    if (tier !== originalTier) {
      console.log(`[ModelSelection] Tier adjusted: ${originalTier} → ${tier}`);
    }

    // 5. Select model based on final tier
    const result = this.selectModelForTier(tier, context);
    console.log(`[ModelSelection] Final selection: Tier ${tier} → ${(result.model as any)?.modelId || result.modelId}`);
    return result;
  }

  /**
   * Optimize tier selection based on context
   */
  private optimizeTierForContext(baseTier: ModelTier, context: ModelSelectionContext): ModelTier {
    // Handle large context windows - use Gemini for efficiency
    if (context.tokenCount && context.tokenCount > 50000) {
      // For large contexts, use Gemini 2.5 Flash (tier 2 equiv with 1M context)
      return 2; // Will be handled specially in selectModelForTier
    }

    // Escalate tier for high error rates
    if (context.errorCount && context.errorCount > 2 && baseTier < 4) {
      return (baseTier + 1) as ModelTier;
    }

    // Escalate for explicit reasoning requirements
    if (context.requiresReasoning && baseTier < 3) {
      return 3;
    }

    // Escalate for creative tasks that need better models
    if (context.requiresCreativity && baseTier === 1) {
      return 2;
    }

    return baseTier;
  }

  /**
   * Select a specific model for a given tier
   */
  private selectModelForTier(tier: ModelTier, context: ModelSelectionContext): ModelRoutingResult {
    const tierConfig = getTierConfig(tier);
    
    // Special handling for large contexts
    if (context.tokenCount && context.tokenCount > 50000) {
      // Use Gemini models for their 1M token context
      const largeContextModel = tier <= 2 ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
      console.log(`[ModelSelection] Large context (${context.tokenCount} tokens) → ${largeContextModel}`);
      return routeToModel({ modelId: largeContextModel });
    }

    // Map our tier system to actual model IDs
    const modelMapping: Record<ModelTier, string> = {
      1: 'gemini-2.5-flash-lite',  // Simple/Fast ($0.02/$0.08 per M)
      2: 'gemini-2.5-flash',        // Balanced ($0.075/$0.30 per M)
      3: 'o4-mini',                 // Complex & Diagnostics ($0.60/$2.40 per M)
      4: 'gemini-2.5-pro'           // Frontier default ($1.25/$5 per M)
    };

    const selectedModel = modelMapping[tier];
    console.log(`[ModelSelection] Tier ${tier} mapped to model: ${selectedModel}`);
    console.log(`[ModelSelection] Cost profile: ${tierConfig.description}`);

    // Try primary model first
    try {
      return routeToModel({ modelId: selectedModel });
    } catch (error) {
      // Fall back to tier-based selection if specific model unavailable
      console.warn(`[ModelSelection] Primary model ${selectedModel} unavailable, using fallback`);
      return this.selectFallbackModel(tier);
    }
  }

  /**
   * Select a frontier model by ID
   */
  private selectFrontierModel(modelId: string): ModelRoutingResult {
    const frontierModel = FRONTIER_MODELS[modelId as keyof typeof FRONTIER_MODELS] || FRONTIER_MODELS['auto'];
    return routeToModel({ modelId: frontierModel });
  }

  /**
   * Select fallback model for a tier
   */
  private selectFallbackModel(tier: ModelTier): ModelRoutingResult {
    const fallbackMapping: Record<ModelTier, string> = {
      1: 'gpt-5-nano',                    // Fallback for Simple/Fast
      2: 'gpt-5-mini',                    // Fallback for Balanced
      3: 'gemini-2.5-pro',                // Fallback for Complex
      4: 'claude-opus-4-20250514'         // Fallback for Frontier
    };

    return routeToModel({ modelId: fallbackMapping[tier] });
  }

  /**
   * Get cost estimate for a model selection
   */
  public estimateCost(
    tier: ModelTier,
    inputTokens: number,
    outputTokens: number
  ): number {
    const tierConfig = getTierConfig(tier);
    const costPerMillion = tierConfig.maxCostPerMillion;
    
    // Rough estimate based on tier max costs
    const inputCost = (inputTokens / 1000000) * (costPerMillion * 0.2); // Input usually cheaper
    const outputCost = (outputTokens / 1000000) * (costPerMillion * 0.8); // Output more expensive
    
    return inputCost + outputCost;
  }

  /**
   * Get recommended tier for a task type
   */
  public recommendTier(taskType: string): ModelTier {
    const taskTierMapping: Record<string, ModelTier> = {
      // Tier 1: Simple/Fast
      'classification': 1,
      'extraction': 1,
      'formatting': 1,
      'simple_qa': 1,
      
      // Tier 2: Balanced
      'tutoring': 2,
      'feedback': 2,
      'generation': 2,
      'coaching': 2,
      
      // Tier 3: Complex & Diagnostics
      'reasoning': 3,
      'diagnostics': 3,
      'problem_solving': 3,
      'analysis': 3,
      
      // Tier 4: Frontier
      'research': 4,
      'complex_agent': 4,
      'curriculum': 4,
      'multimodal': 4
    };

    return taskTierMapping[taskType] || 2; // Default to balanced
  }
}

// Export singleton instance
export const modelSelection = new ModelSelectionService();