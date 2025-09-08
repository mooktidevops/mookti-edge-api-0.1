import { NextRequest, NextResponse } from 'next/server';
import { reviewService } from '../../../src/services/review-service';
import { verifyApiAuth } from '../../../lib/auth-middleware';

export const runtime = 'edge';

// GET /api/admin/reviews/stats - Get review statistics
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7');
    
    const stats = await reviewService.getReviewStats(days);
    
    if (!stats) {
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      ...stats,
      period: `${days} days`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review statistics' },
      { status: 500 }
    );
  }
}