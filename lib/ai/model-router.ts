import { LanguageModel } from 'ai';
import { providers, AIProvider, getAvailableProviders, getDefaultProvider } from './providers';
import { ModelConfig, ModelSelectionRequest, getModelById, getDefaultModelForProvider, availableModels } from './models';

// Model routing result
export interface ModelRoutingResult {
  provider: AIProvider;
  modelId: string;
  modelConfig: ModelConfig;
  model: LanguageModel;
}

// Route to the appropriate model based on selection criteria
export function routeToModel(request: ModelSelectionRequest = {}): ModelRoutingResult {
  const availableProviders = getAvailableProviders();
  
  if (availableProviders.length === 0) {
    throw new Error('No AI providers configured. Please set API keys in environment variables.');
  }

  // If specific model ID is provided, use it directly
  if (request.modelId) {
    const modelConfig = getModelById(request.modelId);
    if (!modelConfig) {
      throw new Error(`Model ${request.modelId} not found`);
    }
    
    if (!availableProviders.includes(modelConfig.provider)) {
      throw new Error(`Provider ${modelConfig.provider} is not configured for model ${request.modelId}`);
    }

    return {
      provider: modelConfig.provider,
      modelId: modelConfig.id,
      modelConfig,
      model: getLanguageModel(modelConfig.provider, modelConfig.id),
    };
  }

  // If specific provider is requested, use it
  let selectedProvider: AIProvider;
  if (request.provider) {
    if (!availableProviders.includes(request.provider)) {
      throw new Error(`Provider ${request.provider} is not configured`);
    }
    selectedProvider = request.provider;
  } else {
    selectedProvider = getDefaultProvider();
  }

  // Find suitable model based on criteria
  let candidateModels = availableModels.filter(model => model.provider === selectedProvider);

  // Filter by tier if specified
  if (request.tier) {
    candidateModels = candidateModels.filter(model => model.tier === request.tier);
  }

  // Filter by cost constraints
  if (request.maxCostPer1kInput !== undefined) {
    candidateModels = candidateModels.filter(model => model.costPer1kInput <= request.maxCostPer1kInput!);
  }
  if (request.maxCostPer1kOutput !== undefined) {
    candidateModels = candidateModels.filter(model => model.costPer1kOutput <= request.maxCostPer1kOutput!);
  }

  // Filter by capability requirements
  if (request.requireVision) {
    candidateModels = candidateModels.filter(model => model.capabilities.vision);
  }
  if (request.requireFunctionCalling) {
    candidateModels = candidateModels.filter(model => model.capabilities.functionCalling);
  }

  // Select the best model from candidates
  if (candidateModels.length === 0) {
    // Fallback to default model for provider
    const defaultModel = getDefaultModelForProvider(selectedProvider);
    if (!defaultModel) {
      throw new Error(`No suitable model found for provider ${selectedProvider}`);
    }
    candidateModels = [defaultModel];
  }

  // Choose the model (prefer by tier: M > F > S for general use)
  const selectedModel = 
    candidateModels.find(m => m.tier === 'M') ||
    candidateModels.find(m => m.tier === 'F') ||
    candidateModels[0];

  return {
    provider: selectedProvider,
    modelId: selectedModel.id,
    modelConfig: selectedModel,
    model: getLanguageModel(selectedProvider, selectedModel.id),
  };
}

// Get the actual language model instance from Vercel AI SDK
function getLanguageModel(provider: AIProvider, modelId: string): LanguageModel {
  const providerInstance = providers[provider];
  
  switch (provider) {
    case 'anthropic':
      return (providerInstance as any)(modelId);
    case 'openai':
      return (providerInstance as any)(modelId);
    case 'google':
      return (providerInstance as any)(modelId);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Export convenience functions for common use cases
export function getReasoningModel(provider?: AIProvider): ModelRoutingResult {
  return routeToModel({ provider, tier: 'F' });
}

export function getFastModel(provider?: AIProvider): ModelRoutingResult {
  return routeToModel({ provider, tier: 'M' });
}

export function getBudgetModel(provider?: AIProvider): ModelRoutingResult {
  return routeToModel({ provider, tier: 'S' });
}

export function getVisionModel(provider?: AIProvider): ModelRoutingResult {
  return routeToModel({ provider, requireVision: true });
}