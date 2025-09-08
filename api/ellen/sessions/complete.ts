import { NextRequest, NextResponse } from 'next/server';
import { EllenSessionStorage } from '../../../lib/storage/ellen-session-storage';
import { jobQueue } from '../../../lib/job-queue';

export const runtime = 'edge';

const sessionStorage = new EllenSessionStorage();

interface CompleteSessionRequest {
  sessionId: string;
  keyTakeaways?: string[];
  confidenceRating?: number;
  understandingRating?: number;
  difficultyRating?: number;
  nextIntention?: any;
}

// POST /api/ellen/sessions/complete - Complete a session and update Growth Compass
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CompleteSessionRequest;
    
    const { 
      sessionId,
      keyTakeaways,
      confidenceRating,
      understandingRating,
      difficultyRating,
      nextIntention
    } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Get the session before completing it
    const session = await sessionStorage.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Complete the session
    const completedSession = await sessionStorage.completeSession(sessionId, {
      keyTakeaways,
      confidenceRating,
      understandingRating,
      difficultyRating
    });

    if (!completedSession) {
      return NextResponse.json(
        { error: 'Failed to complete session' },
        { status: 500 }
      );
    }

    // Queue background jobs for async processing
    const jobPromises = [];

    // Queue review trigger job
    if (completedSession.userId) {
      jobPromises.push(
        jobQueue.enqueue('review-trigger', {
          sessionId: completedSession.id,
          userId: completedSession.userId,
          sessionType: completedSession.type,
          messageCount: completedSession.messages.length,
          duration: completedSession.totalDuration,
          userRatings: {
            confidence: confidenceRating,
            understanding: understandingRating,
            difficulty: difficultyRating
          }
        })
      );
    }

    // Queue Growth Compass update job
    if (completedSession.userId && completedSession.growthContributions) {
      jobPromises.push(
        jobQueue.enqueue('growth-compass-update', {
          sessionId: completedSession.id,
          userId: completedSession.userId,
          keyTakeaways,
          confidenceRating,
          understandingRating,
          difficultyRating
        })
      );
    }

    // Queue pattern detection job
    if (completedSession.userId) {
      jobPromises.push(
        jobQueue.enqueue('pattern-detection', {
          userId: completedSession.userId,
          sessionId: completedSession.id
        })
      );
    }

    // Queue milestone check job
    if (completedSession.userId) {
      jobPromises.push(
        jobQueue.enqueue('milestone-check', {
          sessionId: completedSession.id,
          userId: completedSession.userId,
          keyTakeaways
        })
      );
    }

    // Wait for all jobs to be enqueued (but not processed)
    const jobIds = await Promise.all(jobPromises);

    // Generate next suggestion synchronously (it's quick)
    const nextSuggestion = generateNextSuggestion(completedSession, { trend: 'steady' });

    // Return immediate response with processing status
    return NextResponse.json({
      session: completedSession,
      status: 'processing',
      jobIds,
      nextSuggestion,
      message: 'Session completed successfully. Growth metrics are being calculated in the background.'
    });

  } catch (error) {
    console.error('Session completion error:', error);
    return NextResponse.json(
      { error: 'Failed to complete session' },
      { status: 500 }
    );
  }
}


// Helper function to generate next session suggestion
function generateNextSuggestion(session: any, velocity: any): any {
  const suggestion: any = {};

  // Suggest based on current velocity trend
  if (velocity.trend === 'declining') {
    suggestion.type = 'reflection';
    suggestion.focus = 'Review and consolidate recent learning';
    suggestion.duration = 20;
  } else if (session.type === 'study') {
    suggestion.type = 'retrieval';
    suggestion.focus = 'Practice recall of today\'s material';
    suggestion.duration = 15;
  } else if (session.type === 'writing') {
    suggestion.type = 'revision';
    suggestion.focus = 'Revise and polish your draft';
    suggestion.duration = 30;
  } else {
    suggestion.type = 'study';
    suggestion.focus = 'Continue with your learning plan';
    suggestion.duration = 25;
  }

  return suggestion;
}