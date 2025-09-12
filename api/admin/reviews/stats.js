"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const review_service_1 = require("../../../src/services/review-service");
const auth_middleware_1 = require("../../../lib/auth-middleware");
exports.runtime = 'edge';
// GET /api/admin/reviews/stats - Get review statistics
async function GET(request) {
    try {
        // Verify admin authentication
        const authResult = await (0, auth_middleware_1.verifyApiAuth)(request);
        if (!authResult.success) {
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const url = new URL(request.url);
        const days = parseInt(url.searchParams.get('days') || '7');
        const stats = await review_service_1.reviewService.getReviewStats(days);
        if (!stats) {
            return server_1.NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
        }
        return server_1.NextResponse.json({
            ...stats,
            period: `${days} days`,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching review stats:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch review statistics' }, { status: 500 });
    }
}
