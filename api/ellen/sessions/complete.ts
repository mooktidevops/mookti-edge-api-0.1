import { NextRequest, NextResponse } from 'next/server';
import { EllenSessionStorage } from '../../../lib/storage/ellen-session-storage';
// TODO: Growth Compass integration - to be completed during UI polish phase

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

    // Update Growth Compass with session contributions
    // SIMPLIFIED: Full integration pending during Growth Compass UI polish phase
    if (completedSession.userId && completedSession.growthContributions) {
      try {
        // Placeholder for Growth Compass integration
        const growthData = null; // await growthCompassStorage.getGrowthCompassData(completedSession.userId);
        
        if (growthData) {
          // Add session to history
          const sessionRecord = {
            id: completedSession.id,
            type: completedSession.type,
            startTime: completedSession.startedAt,
            endTime: completedSession.completedAt || new Date(),
            duration: completedSession.totalDuration,
            processType: completedSession.sessionGoal?.type,
            focusDuration: completedSession.totalDuration,
            performance: understandingRating || 3,
            energy: confidenceRating || 3
          };

          growthData.rhythmData.actualSessions.push(sessionRecord);

          // Update Growth Velocity components based on session
          const velocity = growthData.growthVelocity;
          
          // Update components with weighted average
          const weight = 0.1; // New session has 10% weight
          
          if (completedSession.growthContributions.goalAlignment !== undefined) {
            velocity.components.goalAlignment = 
              velocity.components.goalAlignment * (1 - weight) + 
              completedSession.growthContributions.goalAlignment * weight;
          }

          if (completedSession.growthContributions.processEngagement !== undefined) {
            // Process engagement is now part of Growth Compass v5
            const currentProcess = velocity.components.balanceIndex; // Using balance as proxy for now
            velocity.components.balanceIndex = 
              currentProcess * (1 - weight) + 
              completedSession.growthContributions.processEngagement * weight;
          }

          if (completedSession.growthContributions.depthScore !== undefined) {
            velocity.components.depthScore = 
              velocity.components.depthScore * (1 - weight) + 
              completedSession.growthContributions.depthScore * weight;
          }

          if (completedSession.growthContributions.reflectionQuality !== undefined) {
            velocity.components.reflectionQuality = 
              velocity.components.reflectionQuality * (1 - weight) + 
              completedSession.growthContributions.reflectionQuality * weight;
          }

          // Recalculate overall velocity score
          velocity.score = 
            velocity.components.goalAlignment * 0.30 +
            velocity.components.balanceIndex * 0.20 +  // Now includes process engagement
            velocity.components.depthScore * 0.20 +
            velocity.components.recoveryEngagement * 0.15 +
            velocity.components.reflectionQuality * 0.15;

          // Update trend
          const previousScore = growthData.growthVelocity.score;
          if (velocity.score > previousScore + 5) {
            velocity.trend = 'rising';
          } else if (velocity.score < previousScore - 5) {
            velocity.trend = 'declining';
          } else {
            velocity.trend = 'steady';
          }

          velocity.lastUpdated = new Date();

          // Check for milestone achievements
          const milestones = checkMilestoneProgress(completedSession, growthData);

          // Save updated Growth Compass data
          // await growthCompassStorage.updateGrowthCompassData(completedSession.userId, growthData);

          // Return completion response with Growth Compass update
          return NextResponse.json({
            session: completedSession,
            growthCompass: {
              velocityUpdate: velocity.score,
              trend: velocity.trend,
              milestonesEarned: milestones,
              nextSuggestion: generateNextSuggestion(completedSession, velocity)
            }
          });
        }
      } catch (error) {
        console.error('Growth Compass update error:', error);
        // Don't fail the session completion if Growth Compass update fails
      }
    }

    // Return basic completion response if no Growth Compass update
    return NextResponse.json({
      session: completedSession,
      message: 'Session completed successfully'
    });

  } catch (error) {
    console.error('Session completion error:', error);
    return NextResponse.json(
      { error: 'Failed to complete session' },
      { status: 500 }
    );
  }
}

// Helper function to check milestone progress
function checkMilestoneProgress(session: any, growthData: any): string[] {
  const earned: string[] = [];

  // Check for first session milestone
  if (growthData.rhythmData.actualSessions.length === 1) {
    earned.push('getting_started');
  }

  // Check for focus session milestone
  if (session.totalDuration >= 45 && session.type === 'study') {
    earned.push('deep_diver');
  }

  // Check for reflection milestone
  if (session.keyTakeaways && session.keyTakeaways.length >= 3) {
    earned.push('reflection_explorer');
  }

  // Check for consistency milestone
  const recentSessions = growthData.rhythmData.actualSessions.slice(-5);
  if (recentSessions.length === 5) {
    const inOptimalWindows = recentSessions.filter((s: any) => {
      const hour = new Date(s.startTime).getHours();
      return growthData.rhythmData.optimalWindows.some((w: any) => 
        hour >= w.startHour && hour <= w.endHour
      );
    });
    if (inOptimalWindows.length >= 3) {
      earned.push('rhythm_finder');
    }
  }

  return earned;
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