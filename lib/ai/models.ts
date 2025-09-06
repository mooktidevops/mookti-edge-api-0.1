import { AIProvider } from './providers';

// Model configuration interface
export interface ModelConfig {
  id: string;
  name: string;
  provider: AIProvider;
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kInput: number;  // in USD
  costPer1kOutput: number; // in USD
  capabilities: {
    streaming: boolean;
    functionCalling: boolean;
    vision: boolean;
  };
  tier?: 'S' | 'M' | 'F';
}

// Available models catalog
export const availableModels: ModelConfig[] = [
  // Anthropic models
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    tier: 'F',
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    tier: 'M',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.001,
    costPer1kOutput: 0.005,
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
    },
    tier: 'S',
  },

  // OpenAI models
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    tier: 'M',
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    tier: 'F',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    tier: 'S',
  },

  // Google models
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.0035,
    costPer1kOutput: 0.014,
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    tier: 'F',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.00035,
    costPer1kOutput: 0.0014,
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    tier: 'S',
  },
];

// Get models by provider
export function getModelsByProvider(provider: AIProvider): ModelConfig[] {
  return availableModels.filter(model => model.provider === provider);
}

// Get models by tier
export function getModelsByTier(tier: ModelConfig['tier']): ModelConfig[] {
  return availableModels.filter(model => model.tier === tier);
}

// Get model by ID
export function getModelById(modelId: string): ModelConfig | undefined {
  return availableModels.find(model => model.id === modelId);
}

// Get default model for a provider
export function getDefaultModelForProvider(provider: AIProvider): ModelConfig | undefined {
  const models = getModelsByProvider(provider);
  // Return the 'M' tier model as default, or the first available
  return models.find(m => m.tier === 'M') || models[0];
}

// Model selector interface for user requests
export interface ModelSelectionRequest {
  provider?: AIProvider;
  modelId?: string;
  tier?: ModelConfig['tier'];
  maxCostPer1kInput?: number;
  maxCostPer1kOutput?: number;
  requireVision?: boolean;
  requireFunctionCalling?: boolean;
}