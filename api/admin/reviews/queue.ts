import { NextRequest, NextResponse } from 'next/server';
import { reviewService } from '../../../src/services/review-service';
import { withAdminAuth } from '../../../lib/admin-auth-middleware';
import { ADMIN_PERMISSIONS } from '../../../src/lib/db/admin-schema';

export const runtime = 'edge';

// GET /api/admin/reviews/queue - Get pending reviews
export const GET = withAdminAuth(async (request: NextRequest, auth) => {
  try {
    
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status') || 'pending';
    
    const queue = await reviewService.getReviewQueue(limit);
    
    return NextResponse.json({
      items: queue,
      count: queue.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching review queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review queue' },
      { status: 500 }
    );
  }
}, [ADMIN_PERMISSIONS.VIEW_REVIEWS]);

// POST /api/admin/reviews/queue/:id/assign - Assign a review
export const POST = withAdminAuth(async (request: NextRequest, auth) => {
  try {

    const body = await request.json() as { queueId?: string; reviewerId?: string };
    const { queueId, reviewerId } = body;

    if (!queueId) {
      return NextResponse.json(
        { error: 'queueId is required' },
        { status: 400 }
      );
    }

    const assigned = await reviewService.assignReview(
      queueId,
      reviewerId || auth.userId!
    );

    if (assigned) {
      return NextResponse.json({
        success: true,
        message: 'Review assigned successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to assign review' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error assigning review:', error);
    return NextResponse.json(
      { error: 'Failed to assign review' },
      { status: 500 }
    );
  }
}, [ADMIN_PERMISSIONS.CREATE_REVIEWS]);