// Simplified authentication for Vercel Edge Runtime
// Edge Runtime doesn't support firebase-admin due to Node.js dependencies

import type { ErrorResponse } from './types';

export async function verifyFirebaseToken(authHeader: string | null): Promise<{
  success: boolean;
  userId?: string;
  email?: string;
  error?: ErrorResponse;
}> {
  // TEMPORARY: Skip auth verification for MVP testing
  // Firebase Admin SDK is not compatible with Edge Runtime
  
  // TODO: For production, implement one of these solutions:
  // 1. Use a lightweight JWT library (like @tsndr/cloudflare-worker-jwt)
  // 2. Call Firebase Auth REST API to verify tokens
  // 3. Move auth verification to a separate Node.js API route
  // 4. Use Vercel Functions (Node.js runtime) instead of Edge Functions
  
  console.log('⚠️ Auth verification temporarily disabled for Edge Runtime compatibility');
  
  // For testing, accept any request and return a mock user
  return {
    success: true,
    userId: 'test-user-' + Date.now(),
    email: 'test@mookti.app',
  };
}

// Simple rate limiting (placeholder)
export async function checkRateLimit(userId: string, limit: number = 100): Promise<boolean> {
  // For MVP, allow all requests
  // TODO: Implement proper rate limiting with Vercel KV or Upstash
  return true;
}