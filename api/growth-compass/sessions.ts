import { NextRequest, NextResponse } from 'next/server';
import growthCompassStorage from '../../lib/storage/growth-compass-storage';
import { calculateGrowthVelocity } from '../../lib/growth-compass/calculations';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = searchParams.get('limit');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    const sessions = await growthCompassStorage.getSessions(
      userId,
      limit ? parseInt(limit) : undefined,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { userId?: string; [key: string]: any };
    const { userId, ...sessionData } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    // Validate required session fields
    if (!sessionData.startTime || !sessionData.endTime || !sessionData.type) {
      return NextResponse.json(
        { error: 'startTime, endTime, and type are required' },
        { status: 400 }
      );
    }
    
    // Calculate focus duration if not provided
    if (!sessionData.focusDuration) {
      const start = new Date(sessionData.startTime);
      const end = new Date(sessionData.endTime);
      sessionData.focusDuration = Math.round((end.getTime() - start.getTime()) / 60000);
    }
    
    // Set default quality if not provided
    if (!sessionData.quality) {
      sessionData.quality = 70; // Default neutral quality
    }
    
    // Add the session
    const session = await growthCompassStorage.addSession(userId, sessionData as any);
    
    // Recalculate Growth Velocity after adding session
    const data = await growthCompassStorage.getGrowthCompassData(userId);
    if (data) {
      const sessions = await growthCompassStorage.getSessions(userId, 100);
      const recoveryActivities = await growthCompassStorage.getRecoveryActivities(userId);
      
      // Calculate new velocity based on recent data
      const newVelocity = calculateGrowthVelocity(
        data.growthVelocity.components,
        data.currentSeason
      );
      
      // Determine trend
      const oldScore = data.growthVelocity.score;
      const trend = newVelocity > oldScore + 5 ? 'rising' :
                    newVelocity < oldScore - 5 ? 'declining' : 'steady';
      
      // Update Growth Velocity
      await growthCompassStorage.updateGrowthCompassData(userId, {
        growthVelocity: {
          score: newVelocity,
          trend,
          components: data.growthVelocity.components,
          lastUpdated: new Date()
        }
      });
    }
    
    return NextResponse.json({
      session,
      message: 'Session added successfully'
    });
  } catch (error) {
    console.error('Error adding session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}