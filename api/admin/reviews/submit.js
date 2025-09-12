"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const review_service_1 = require("../../../src/services/review-service");
const auth_middleware_1 = require("../../../lib/auth-middleware");
exports.runtime = 'edge';
// POST /api/admin/reviews/submit - Submit a human review
async function POST(request) {
    try {
        // Verify admin authentication
        const authResult = await (0, auth_middleware_1.verifyApiAuth)(request);
        if (!authResult.success) {
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const body = await request.json();
        const { queueId, sessionId, scores, flags, insights, issues, recommendations, humanNotes, tags } = body;
        if (!queueId || !sessionId) {
            return server_1.NextResponse.json({ error: 'queueId and sessionId are required' }, { status: 400 });
        }
        // Validate scores are between 0-100
        if (scores) {
            for (const [key, value] of Object.entries(scores)) {
                if (typeof value === 'number' && (value < 0 || value > 100)) {
                    return server_1.NextResponse.json({ error: `Score ${key} must be between 0 and 100` }, { status: 400 });
                }
            }
        }
        await review_service_1.reviewService.submitHumanReview(queueId, sessionId, {
            scores: scores || {},
            flags: (Array.isArray(flags) ? {} : flags) || {},
            insights,
            issues,
            recommendations,
            humanNotes,
            tags
        });
        return server_1.NextResponse.json({
            success: true,
            message: 'Review submitted successfully'
        });
    }
    catch (error) {
        console.error('Error submitting review:', error);
        return server_1.NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
    }
}
