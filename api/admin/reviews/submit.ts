import { NextRequest, NextResponse } from 'next/server';
import { reviewService } from '../../../src/services/review-service';
import { verifyApiAuth } from '../../../lib/auth-middleware';

export const runtime = 'edge';

// POST /api/admin/reviews/submit - Submit a human review
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as {
      queueId?: string;
      sessionId?: string;
      scores?: Record<string, number>;
      flags?: string[];
      insights?: string[];
      issues?: string[];
      recommendations?: string[];
      humanNotes?: string;
      tags?: string[];
    };
    const {
      queueId,
      sessionId,
      scores,
      flags,
      insights,
      issues,
      recommendations,
      humanNotes,
      tags
    } = body;

    if (!queueId || !sessionId) {
      return NextResponse.json(
        { error: 'queueId and sessionId are required' },
        { status: 400 }
      );
    }

    // Validate scores are between 0-100
    if (scores) {
      for (const [key, value] of Object.entries(scores)) {
        if (typeof value === 'number' && (value < 0 || value > 100)) {
          return NextResponse.json(
            { error: `Score ${key} must be between 0 and 100` },
            { status: 400 }
          );
        }
      }
    }

    await reviewService.submitHumanReview(
      queueId,
      sessionId,
      {
        scores: scores || {},
        flags: (Array.isArray(flags) ? {} : flags) || {},
        insights,
        issues,
        recommendations,
        humanNotes,
        tags
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}