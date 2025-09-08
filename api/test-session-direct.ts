import { NextRequest, NextResponse } from 'next/server';
import { EllenSessionStorage } from '../lib/storage/ellen-session-storage';

export const runtime = 'edge';

const sessionStorage = new EllenSessionStorage();

// TEST ENDPOINT - Remove before production
export async function GET(request: NextRequest) {
  try {
    // Create a test session directly
    const session = await sessionStorage.createSession({
      userId: 'test-user-preview',
      type: 'study',
      title: 'Direct Test Session',
      context: {
        timestamp: new Date().toISOString()
      } as any
    });

    return NextResponse.json({
      success: true,
      message: 'Session storage is working!',
      session: {
        id: session.id,
        type: session.type,
        status: session.status,
        title: session.title
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      stack: error.stack
    }, { status: 500 });
  }
}