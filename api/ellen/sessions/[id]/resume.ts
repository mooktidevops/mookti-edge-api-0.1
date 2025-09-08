import { NextRequest, NextResponse } from 'next/server';
import { EllenSessionStorage } from '../../../../lib/storage/ellen-session-storage';
import { verifyApiAuth, unauthorizedResponse } from '../../../../lib/auth-middleware';

export const runtime = 'edge';

const sessionStorage = new EllenSessionStorage();

// POST /api/ellen/sessions/[id]/resume - Resume a paused session
export async function POST(request: NextRequest) {
  // Verify authentication
  const auth = await verifyApiAuth(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  try {
    // Extract session ID from URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const sessionIdIndex = pathSegments.indexOf('sessions') + 1;
    
    if (sessionIdIndex >= pathSegments.length) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    const sessionId = pathSegments[sessionIdIndex];
    
    // Resume the session
    const session = await sessionStorage.resumeSession(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Failed to resume session' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Session resumed successfully',
      session
    });
    
  } catch (error) {
    console.error('Resume session error:', error);
    return NextResponse.json(
      { error: 'Failed to resume session' },
      { status: 500 }
    );
  }
}