"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const server_1 = require("next/server");
// Mock the services
globals_1.jest.mock('../../src/services/review-service', () => ({
    reviewService: {
        getReviewQueue: globals_1.jest.fn(),
        assignReview: globals_1.jest.fn(),
        submitHumanReview: globals_1.jest.fn(),
        getReviewStats: globals_1.jest.fn()
    }
}));
globals_1.jest.mock('../../lib/admin-auth-middleware', () => ({
    verifyAdminAuth: globals_1.jest.fn(),
    withAdminAuth: (handler, permissions) => {
        return async (request) => {
            const mockAuth = {
                authenticated: true,
                isAdmin: true,
                userId: 'admin_user_123',
                role: 'admin',
                permissions: ['view_reviews', 'create_reviews']
            };
            return handler(request, mockAuth);
        };
    }
}));
globals_1.jest.mock('../../src/services/admin-auth-service', () => ({
    adminAuthService: {
        checkAdminAccess: globals_1.jest.fn(),
        logAdminAction: globals_1.jest.fn()
    }
}));
// Import the API handlers
const queue_1 = require("../../api/admin/reviews/queue");
const submit_1 = require("../../api/admin/reviews/submit");
const stats_1 = require("../../api/admin/reviews/stats");
(0, globals_1.describe)('Admin Review API Endpoints', () => {
    let mockReviewService;
    (0, globals_1.beforeEach)(() => {
        mockReviewService = require('../../src/services/review-service').reviewService;
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('GET /api/admin/reviews/queue', () => {
        (0, globals_1.it)('should return review queue successfully', async () => {
            const mockQueue = [
                {
                    id: 'queue_1',
                    sessionId: 'session_1',
                    priority: 90,
                    reason: 'High frustration',
                    triggerType: 'frustration',
                    status: 'pending',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'queue_2',
                    sessionId: 'session_2',
                    priority: 75,
                    reason: 'Early abandonment',
                    triggerType: 'abandonment',
                    status: 'pending',
                    createdAt: new Date().toISOString()
                }
            ];
            mockReviewService.getReviewQueue.mockResolvedValue(mockQueue);
            const request = new server_1.NextRequest('http://localhost:3000/api/admin/reviews/queue?limit=10');
            const response = await (0, queue_1.GET)(request);
            const data = await response.json();
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(data.items).toEqual(mockQueue);
            (0, globals_1.expect)(data.count).toBe(2);
            (0, globals_1.expect)(mockReviewService.getReviewQueue).toHaveBeenCalledWith(10);
        });
        (0, globals_1.it)('should handle different limit parameter', async () => {
            mockReviewService.getReviewQueue.mockResolvedValue([]);
            const request = new server_1.NextRequest('http://localhost:3000/api/admin/reviews/queue?limit=25');
            const response = await (0, queue_1.GET)(request);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(mockReviewService.getReviewQueue).toHaveBeenCalledWith(25);
        });
        (0, globals_1.it)('should handle service errors', async () => {
            mockReviewService.getReviewQueue.mockRejectedValue(new Error('Database error'));
            const request = new server_1.NextRequest('http://localhost:3000/api/admin/reviews/queue');
            const response = await (0, queue_1.GET)(request);
            const data = await response.json();
            (0, globals_1.expect)(response.status).toBe(500);
            (0, globals_1.expect)(data.error).toBe('Failed to fetch review queue');
        });
    });
    (0, globals_1.describe)('POST /api/admin/reviews/queue (assign)', () => {
        (0, globals_1.it)('should assign review successfully', async () => {
            mockReviewService.assignReview.mockResolvedValue(true);
            const request = new server_1.NextRequest('http://localhost:3000/api/admin/reviews/queue', {
                method: 'POST',
                body: JSON.stringify({
                    queueId: 'queue_123',
                    reviewerId: 'reviewer_456'
                })
            });
            const response = await (0, queue_1.POST)(request);
            const data = await response.json();
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(data.success).toBe(true);
            (0, globals_1.expect)(mockReviewService.assignReview).toHaveBeenCalledWith('queue_123', 'reviewer_456');
        });
        (0, globals_1.it)('should use auth userId if no reviewerId provided', async () => {
            mockReviewService.assignReview.mockResolvedValue(true);
            const request = new server_1.NextRequest('http://localhost:3000/api/admin/reviews/queue', {
                method: 'POST',
                body: JSON.stringify({
                    queueId: 'queue_123'
                })
            });
            const response = await (0, queue_1.POST)(request);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(mockReviewService.assignReview).toHaveBeenCalledWith('queue_123', 'admin_user_123');
        });
        (0, globals_1.it)('should return error if queueId missing', async () => {
            const request = new server_1.NextRequest('http://localhost:3000/api/admin/reviews/queue', {
                method: 'POST',
                body: JSON.stringify({})
            });
            const response = await (0, queue_1.POST)(request);
            const data = await response.json();
            (0, globals_1.expect)(response.status).toBe(400);
            (0, globals_1.expect)(data.error).toBe('queueId is required');
        });
        (0, globals_1.it)('should handle assignment failure', async () => {
            mockReviewService.assignReview.mockResolvedValue(false);
            const request = new server_1.NextRequest('http://localhost:3000/api/admin/reviews/queue', {
                method: 'POST',
                body: JSON.stringify({
                    queueId: 'queue_123'
                })
            });
            const response = await (0, queue_1.POST)(request);
            const data = await response.json();
            (0, globals_1.expect)(response.status).toBe(500);
            (0, globals_1.expect)(data.error).toBe('Failed to assign review');
        });
    });
    (0, globals_1.describe)('POST /api/admin/reviews/submit', () => {
        (0, globals_1.it)('should submit review successfully', async () => {
            mockReviewService.submitHumanReview.mockResolvedValue(undefined);
            const reviewData = {
                queueId: 'queue_123',
                sessionId: 'session_456',
                scores: {
                    pedagogicalEffectiveness: 85,
                    studentEngagement: 75,
                    conceptualClarity: 80,
                    appropriateChallenge: 70,
                    emotionalSupport: 90
                },
                flags: {
                    learningObjectiveMet: true,
                    frustrationHandledWell: false,
                    toolSelectionOptimal: true,
                    needsEscalation: false
                },
                humanNotes: 'Good session with minor issues',
                tags: ['excellent', 'minor-confusion']
            };
            const request = new server_1.NextRequest('http://localhost:3000/api/admin/reviews/submit', {
                method: 'POST',
                body: JSON.stringify(reviewData)
            });
            const response = await (0, submit_1.POST)(request);
            const data = await response.json();
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(data.success).toBe(true);
            (0, globals_1.expect)(mockReviewService.submitHumanReview).toHaveBeenCalledWith('queue_123', 'session_456', globals_1.expect.objectContaining({
                scores: reviewData.scores,
                flags: reviewData.flags,
                humanNotes: reviewData.humanNotes,
                tags: reviewData.tags
            }));
        });
        (0, globals_1.it)('should validate score ranges', async () => {
            const request = new server_1.NextRequest('http://localhost:3000/api/admin/reviews/submit', {
                method: 'POST',
                body: JSON.stringify({
                    queueId: 'queue_123',
                    sessionId: 'session_456',
                    scores: {
                        pedagogicalEffectiveness: 150 // Invalid: > 100
                    }
                })
            });
            const response = await (0, submit_1.POST)(request);
            const data = await response.json();
            (0, globals_1.expect)(response.status).toBe(400);
            (0, globals_1.expect)(data.error).toContain('must be between 0 and 100');
        });
        (0, globals_1.it)('should require queueId and sessionId', async () => {
            const request = new server_1.NextRequest('http://localhost:3000/api/admin/reviews/submit', {
                method: 'POST',
                body: JSON.stringify({
                    scores: {}
                })
            });
            const response = await (0, submit_1.POST)(request);
            const data = await response.json();
            (0, globals_1.expect)(response.status).toBe(400);
            (0, globals_1.expect)(data.error).toBe('queueId and sessionId are required');
        });
        (0, globals_1.it)('should handle submission errors', async () => {
            mockReviewService.submitHumanReview.mockRejectedValue(new Error('Database error'));
            const request = new server_1.NextRequest('http://localhost:3000/api/admin/reviews/submit', {
                method: 'POST',
                body: JSON.stringify({
                    queueId: 'queue_123',
                    sessionId: 'session_456'
                })
            });
            const response = await (0, submit_1.POST)(request);
            const data = await response.json();
            (0, globals_1.expect)(response.status).toBe(500);
            (0, globals_1.expect)(data.error).toBe('Failed to submit review');
        });
    });
    (0, globals_1.describe)('GET /api/admin/reviews/stats', () => {
        (0, globals_1.it)('should return review statistics', async () => {
            const mockStats = {
                dailyMetrics: [
                    { date: new Date(), totalSessions: 100, reviewedSessions: 45 }
                ],
                totalReviews: 45,
                averageScores: {
                    pedagogical: 82,
                    engagement: 78
                },
                activePatterns: [
                    { patternType: 'confusion', frequency: 10 }
                ],
                escalatedCount: 3
            };
            mockReviewService.getReviewStats.mockResolvedValue(mockStats);
            const request = new server_1.NextRequest('http://localhost:3000/api/admin/reviews/stats?days=7');
            const response = await (0, stats_1.GET)(request);
            const data = await response.json();
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(data).toMatchObject(mockStats);
            (0, globals_1.expect)(data.period).toBe('7 days');
            (0, globals_1.expect)(mockReviewService.getReviewStats).toHaveBeenCalledWith(7);
        });
        (0, globals_1.it)('should handle custom day ranges', async () => {
            mockReviewService.getReviewStats.mockResolvedValue({});
            const request = new server_1.NextRequest('http://localhost:3000/api/admin/reviews/stats?days=30');
            await (0, stats_1.GET)(request);
            (0, globals_1.expect)(mockReviewService.getReviewStats).toHaveBeenCalledWith(30);
        });
        (0, globals_1.it)('should handle stats fetch failure', async () => {
            mockReviewService.getReviewStats.mockResolvedValue(null);
            const request = new server_1.NextRequest('http://localhost:3000/api/admin/reviews/stats');
            const response = await (0, stats_1.GET)(request);
            const data = await response.json();
            (0, globals_1.expect)(response.status).toBe(500);
            (0, globals_1.expect)(data.error).toBe('Failed to fetch statistics');
        });
        (0, globals_1.it)('should handle service errors', async () => {
            mockReviewService.getReviewStats.mockRejectedValue(new Error('Database error'));
            const request = new server_1.NextRequest('http://localhost:3000/api/admin/reviews/stats');
            const response = await (0, stats_1.GET)(request);
            const data = await response.json();
            (0, globals_1.expect)(response.status).toBe(500);
            (0, globals_1.expect)(data.error).toBe('Failed to fetch review statistics');
        });
    });
});
