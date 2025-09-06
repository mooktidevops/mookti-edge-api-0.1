import { VercelRequest, VercelResponse } from '@vercel/node';
import { generateText } from 'ai';
import { getAvailableProviders, isProviderAvailable, AIProvider } from '../lib/ai/providers';
import { routeToModel, getFastModel } from '../lib/ai/model-router';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const results: any = {
    availableProviders: [],
    providerTests: {},
    timestamp: new Date().toISOString(),
  };

  try {
    // Check available providers
    const availableProviders = getAvailableProviders();
    results.availableProviders = availableProviders;

    if (availableProviders.length === 0) {
      results.error = 'No providers configured. Please set API keys.';
      return res.status(200).json(results);
    }

    // Test each available provider
    for (const provider of availableProviders) {
      try {
        const { model, modelConfig } = getFastModel(provider);
        
        // Simple test generation
        const testResult = await generateText({
          model,
          prompt: `Say "Hello from ${provider}" in exactly 5 words.`,
        });

        results.providerTests[provider] = {
          success: true,
          model: modelConfig.id,
          modelName: modelConfig.name,
          response: testResult.text,
          tokensUsed: testResult.usage?.totalTokens || 0,
        };
      } catch (error: any) {
        results.providerTests[provider] = {
          success: false,
          error: error.message,
        };
      }
    }

    // Test default routing
    try {
      const defaultRoute = routeToModel();
      results.defaultRouting = {
        provider: defaultRoute.provider,
        modelId: defaultRoute.modelId,
        modelName: defaultRoute.modelConfig.name,
      };
    } catch (error: any) {
      results.defaultRouting = {
        error: error.message,
      };
    }

    res.status(200).json(results);
  } catch (error: any) {
    res.status(500).json({
      error: 'Test failed',
      message: error.message,
      availableProviders: results.availableProviders,
    });
  }
}