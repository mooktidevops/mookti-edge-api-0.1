import { NextRequest, NextResponse } from 'next/server';
import { EllenSessionStorage } from '../../../../lib/storage/ellen-session-storage';
import { verifyApiAuth, unauthorizedResponse } from '../../../../lib/auth-middleware';

export const runtime = 'edge';

const sessionStorage = new EllenSessionStorage();

// POST /api/ellen/sessions/[id]/messages - Add message to session
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
    
    // Parse request body
    const body = await request.json() as { role?: string; content?: string; metadata?: any };
    const { role, content, metadata } = body;
    
    // Validate required fields
    if (!role || !content) {
      return NextResponse.json(
        { error: 'Role and content are required' },
        { status: 400 }
      );
    }
    
    if (!['user', 'assistant', 'system'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be user, assistant, or system' },
        { status: 400 }
      );
    }
    
    // Add message to session
    const message = await sessionStorage.addMessage({
      sessionId,
      role: role as 'user' | 'assistant' | 'system',
      content,
      metadata
    });
    
    if (!message) {
      return NextResponse.json(
        { error: 'Failed to add message to session' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(message);
    
  } catch (error) {
    console.error('Add message error:', error);
    return NextResponse.json(
      { error: 'Failed to add message' },
      { status: 500 }
    );
  }
}

// GET /api/ellen/sessions/[id]/messages - Get session messages
export async function GET(request: NextRequest) {
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
    
    // Get session with messages
    const session = await sessionStorage.getSession(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Return just the messages
    return NextResponse.json({
      messages: session.messages || [],
      count: session.messages?.length || 0
    });
    
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
}