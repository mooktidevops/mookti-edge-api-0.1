import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

// Initialize AI providers with API keys from environment variables
export const providers = {
  anthropic: createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  }),
  openai: createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  }),
  google: createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  }),
} as const;

// Provider types
export type AIProvider = keyof typeof providers;

// Check if a provider is available (has API key configured)
export function isProviderAvailable(provider: AIProvider): boolean {
  switch (provider) {
    case 'anthropic':
      return !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'YOUR_ANTHROPIC_API_KEY_HERE';
    case 'openai':
      return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE';
    case 'google':
      return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GOOGLE_GENERATIVE_AI_API_KEY !== 'YOUR_GOOGLE_AI_API_KEY_HERE';
    default:
      return false;
  }
}

// Get all available providers
export function getAvailableProviders(): AIProvider[] {
  return (Object.keys(providers) as AIProvider[]).filter(isProviderAvailable);
}

// Default provider (fallback)
export function getDefaultProvider(): AIProvider {
  const available = getAvailableProviders();
  if (available.length === 0) {
    throw new Error('No AI providers configured. Please set at least one API key in environment variables.');
  }
  // Prefer Anthropic, then OpenAI, then Google
  if (available.includes('anthropic')) return 'anthropic';
  if (available.includes('openai')) return 'openai';
  return available[0];
}