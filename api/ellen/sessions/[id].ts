import { NextRequest, NextResponse } from 'next/server';
import { EllenSessionStorage } from '../../../lib/storage/ellen-session-storage';
import { verifyApiAuth, unauthorizedResponse } from '../../../lib/auth-middleware';

export const runtime = 'edge';

const sessionStorage = new EllenSessionStorage();

// GET /api/ellen/sessions/[id] - Get specific session
export async function GET(request: NextRequest) {
  // Verify authentication
  const auth = await verifyApiAuth(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Extract session ID from path
    // Pattern: /api/ellen/sessions/{sessionId}
    const sessionId = pathSegments[pathSegments.length - 1];
    
    if (!sessionId || sessionId === 'sessions') {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Get specific session
    const session = await sessionStorage.getSession(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
    
  } catch (error) {
    console.error('Session GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    );
  }
}

// DELETE /api/ellen/sessions/[id] - Delete session
export async function DELETE(request: NextRequest) {
  // Verify authentication
  const auth = await verifyApiAuth(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Extract session ID from path
    const sessionId = pathSegments[pathSegments.length - 1];
    
    if (!sessionId || sessionId === 'sessions') {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Delete the session
    const success = await sessionStorage.deleteSession(sessionId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete session' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Session deleted successfully',
      sessionId
    });
    
  } catch (error) {
    console.error('Session DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}