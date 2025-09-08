import { getEnvironmentConfig } from '../lib/config/environment';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  const envConfig = getEnvironmentConfig();
  
  return new Response(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: envConfig.name,
    devMode: envConfig.enableDevMode,
    version: '1.0.0',
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}