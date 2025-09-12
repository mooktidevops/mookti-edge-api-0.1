"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.GET = exports.runtime = void 0;
const server_1 = require("next/server");
const review_service_1 = require("../../../src/services/review-service");
const admin_auth_middleware_1 = require("../../../lib/admin-auth-middleware");
const admin_schema_1 = require("../../../src/lib/db/admin-schema");
exports.runtime = 'edge';
// GET /api/admin/reviews/queue - Get pending reviews
exports.GET = (0, admin_auth_middleware_1.withAdminAuth)(async (request, auth) => {
    try {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const status = url.searchParams.get('status') || 'pending';
        const queue = await review_service_1.reviewService.getReviewQueue(limit);
        return server_1.NextResponse.json({
            items: queue,
            count: queue.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching review queue:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch review queue' }, { status: 500 });
    }
}, [admin_schema_1.ADMIN_PERMISSIONS.VIEW_REVIEWS]);
// POST /api/admin/reviews/queue/:id/assign - Assign a review
exports.POST = (0, admin_auth_middleware_1.withAdminAuth)(async (request, auth) => {
    try {
        const body = await request.json();
        const { queueId, reviewerId } = body;
        if (!queueId) {
            return server_1.NextResponse.json({ error: 'queueId is required' }, { status: 400 });
        }
        const assigned = await review_service_1.reviewService.assignReview(queueId, reviewerId || auth.userId);
        if (assigned) {
            return server_1.NextResponse.json({
                success: true,
                message: 'Review assigned successfully'
            });
        }
        else {
            return server_1.NextResponse.json({ error: 'Failed to assign review' }, { status: 500 });
        }
    }
    catch (error) {
        console.error('Error assigning review:', error);
        return server_1.NextResponse.json({ error: 'Failed to assign review' }, { status: 500 });
    }
}, [admin_schema_1.ADMIN_PERMISSIONS.CREATE_REVIEWS]);
