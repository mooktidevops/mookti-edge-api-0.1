import { NextRequest, NextResponse } from 'next/server';
import growthCompassStorage from '../../lib/storage/growth-compass-storage';
import { checkDataSufficiency } from '../../lib/growth-compass/data-thresholds';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    // Get user's Growth Compass data
    const data = await growthCompassStorage.getGrowthCompassData(userId);
    
    if (!data) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }
    
    // Check data sufficiency
    const stats = data.dataCollection || {
      weeksActive: 0,
      totalSessions: 0,
      totalDaysActive: 0
    };
    
    // Create sessions per window map for sufficiency check
    const sessionsPerWindow = new Map<string, number>();
    data.rhythmData.heatmapData.forEach((dayData, day) => {
      dayData.forEach(cell => {
        const key = `${day}-${cell.hour}`;
        sessionsPerWindow.set(key, cell.sessionCount);
      });
    });
    
    const sufficiency = checkDataSufficiency(
      stats.weeksActive,
      stats.totalSessions,
      sessionsPerWindow,
      stats.totalDaysActive
    );
    
    // Return data with sufficiency information
    return NextResponse.json({
      data,
      sufficiency,
      recommendations: {
        showRhythmPatterns: sufficiency.recommendationsAllowed.rhythmPatterns,
        showPowerPatterns: sufficiency.recommendationsAllowed.powerPatterns,
        showSyncScore: sufficiency.recommendationsAllowed.syncScore,
        showSeasonSuggestions: sufficiency.recommendationsAllowed.seasonSuggestions
      }
    });
  } catch (error) {
    console.error('Error fetching Growth Compass data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as { userId?: string; [key: string]: any };
    const { userId, ...updates } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    const updatedData = await growthCompassStorage.updateGrowthCompassData(userId, updates);
    
    return NextResponse.json(updatedData);
  } catch (error) {
    console.error('Error updating Growth Compass data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}