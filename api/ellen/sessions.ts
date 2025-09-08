import { NextRequest, NextResponse } from 'next/server';
import { EllenSessionStorage } from '../../lib/storage/ellen-session-storage';
import { verifyApiAuth, unauthorizedResponse } from '../../lib/auth-middleware';
import type { CreateSessionRequest, UpdateSessionRequest } from '../../lib/types/api-types';
import type { SessionType, SessionGoal } from '../../lib/storage/ellen-session-types';

export const runtime = 'edge';

const sessionStorage = new EllenSessionStorage();

// GET /api/ellen/sessions - Get user's sessions
// POST /api/ellen/sessions - Create new session
// GET /api/ellen/sessions/[id] - Get specific session
// PUT /api/ellen/sessions/[id] - Update session
// DELETE /api/ellen/sessions/[id] - Delete session

export async function GET(request: NextRequest) {
  // Verify authentication
  const auth = await verifyApiAuth(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const url = new URL(request.url);
    
    // Get user's sessions
    const userId = url.searchParams.get('userId');
      
      if (!userId) {
        return NextResponse.json(
          { error: 'userId is required' },
          { status: 400 }
        );
      }

      const type = url.searchParams.get('type') as any;
      const status = url.searchParams.get('status') as any;
      const recent = url.searchParams.get('recent') === 'true';

      let sessions;
      if (recent) {
        sessions = await sessionStorage.getRecentSessions(userId, 5);
      } else {
        sessions = await sessionStorage.getUserSessions(userId, {
          type,
          status
        });
      }

      return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Session GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Verify authentication
  const auth = await verifyApiAuth(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const body = await request.json() as CreateSessionRequest;
    
    if (!body.userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const session = await sessionStorage.createSession({
      id: body.id,  // Pass custom ID if provided
      userId: body.userId,
      type: body.type as SessionType || 'study',
      title: body.title,
      context: body.context,
      sessionGoal: body.sessionGoal as SessionGoal,
      resumeFromId: body.resumeFromId
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // Verify authentication
  const auth = await verifyApiAuth(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const sessionId = pathSegments[pathSegments.length - 1];
    
    if (!sessionId || sessionId === 'sessions') {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json() as UpdateSessionRequest;
    
    // Handle special actions
    if (body.action) {
      switch (body.action) {
        case 'pause':
          const paused = await sessionStorage.pauseSession(sessionId);
          return NextResponse.json({ success: paused });
        
        case 'resume':
          const resumed = await sessionStorage.resumeSession(sessionId);
          return NextResponse.json(resumed || { error: 'Session not found' });
        
        case 'complete':
          const completed = await sessionStorage.completeSession(sessionId, {
            keyTakeaways: body.keyTakeaways,
            confidenceRating: body.confidenceRating,
            understandingRating: body.understandingRating,
            difficultyRating: body.difficultyRating
          });
          return NextResponse.json(completed || { error: 'Session not found' });
        
        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          );
      }
    }

    // Regular update
    const updated = await sessionStorage.updateSession(sessionId, body);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Session update error:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Verify authentication
  const auth = await verifyApiAuth(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const sessionId = pathSegments[pathSegments.length - 1];
    
    if (!sessionId || sessionId === 'sessions') {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const deleted = await sessionStorage.deleteSession(sessionId);
    return NextResponse.json({ success: deleted });
  } catch (error) {
    console.error('Session delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}