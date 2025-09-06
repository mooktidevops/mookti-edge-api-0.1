import { NextRequest, NextResponse } from 'next/server';

// TEMPORARY: Simple API key authentication for preview deployment
// TODO: Replace with Firebase auth before production launch (see MOOKTI_COMPREHENSIVE_DEV_PLAN_V5.md)

export async function verifyApiAuth(request: NextRequest): Promise<{ success: boolean; error?: string; userId?: string }> {
  // Check for API key in Authorization header
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return { success: false, error: 'Missing Authorization header' };
  }

  // For preview, use a simple Bearer token
  // This should be set as an environment variable
  const apiKey = process.env.MOOKTI_API_KEY || 'mookti-preview-key-2025';
  
  if (authHeader !== `Bearer ${apiKey}`) {
    return { success: false, error: 'Invalid API key' };
  }

  // For now, use a test user ID
  // In production, decode the actual user from Firebase token
  return { 
    success: true, 
    userId: 'preview-user-001' 
  };
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