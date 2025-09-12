import { NextRequest, NextResponse } from 'next/server';
import { isDevMode, getDevUser } from './config/dev-mode';
import { verifyFirebaseToken } from './auth-native';

// TEMPORARY: Simple API key authentication for preview deployment
// TODO: Replace with Firebase auth before production launch (see MOOKTI_COMPREHENSIVE_DEV_PLAN_V5.md)

export async function verifyApiAuth(request: NextRequest): Promise<{ success: boolean; error?: string; userId?: string }> {
  // Dev mode bypass
  if (isDevMode(request as unknown as Request)) {
    const devUserId = request.headers.get('X-Dev-User-Id');
    const devUser = getDevUser(request as unknown as Request);
    return {
      success: true,
      userId: devUserId || (devUser ? devUser.id : 'dev-user-default')
    };
  }
  
  // Check for API key in Authorization header
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return { success: false, error: 'Missing Authorization header' };
  }

  // Accept API key for preview and service calls
  const apiKey = process.env.MOOKTI_API_KEY || 'mookti-preview-key-2025';
  if (authHeader === `Bearer ${apiKey}`) {
    return { success: true, userId: 'preview-user-001' };
  }

  // Otherwise treat as Firebase ID token
  try {
    const result = await verifyFirebaseToken(authHeader);
    if (result.success) {
      return { success: true, userId: result.userId };
    }
    return { success: false, error: String(result.error || 'Invalid token') };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Auth verification failed' };
  }
}

// Helper to create unauthorized response
export function unauthorizedResponse(error: string = 'Unauthorized') {
  return NextResponse.json(
    { error },
    { 
      status: 401,
      headers: {
        'WWW-Authenticate': 'Bearer realm="Mookti API"'
      }
    }
  );
}

// TODO: Production implementation should use this instead:
// import { verifyFirebaseToken } from './auth-native';
// export async function verifyApiAuth(request: NextRequest) {
//   const authHeader = request.headers.get('Authorization');
//   return await verifyFirebaseToken(authHeader);
// }
