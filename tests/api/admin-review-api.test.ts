import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock the services
jest.mock('../../src/services/review-service', () => ({
  reviewService: {
    getReviewQueue: jest.fn(),
    assignReview: jest.fn(),
    submitHumanReview: jest.fn(),
    getReviewStats: jest.fn()
  }
}));

jest.mock('../../lib/admin-auth-middleware', () => ({
  verifyAdminAuth: jest.fn(),
  withAdminAuth: (handler: Function, permissions?: any[]) => {
    return async (request: NextRequest) => {
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

jest.mock('../../src/services/admin-auth-service', () => ({
  adminAuthService: {
    checkAdminAccess: jest.fn(),
    logAdminAction: jest.fn()
  }
}));

// Import the API handlers
import { GET as getQueue, POST as assignReview } from '../../api/admin/reviews/queue';
import { POST as submitReview } from '../../api/admin/reviews/submit';
import { GET as getStats } from '../../api/admin/reviews/stats';

describe('Admin Review API Endpoints', () => {
  let mockReviewService: any;
  
  beforeEach(() => {
    mockReviewService = require('../../src/services/review-service').reviewService;
    jest.clearAllMocks();
  });

  describe('GET /api/admin/reviews/queue', () => {
    it('should return review queue successfully', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/admin/reviews/queue?limit=10');
      const response = await getQueue(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toEqual(mockQueue);
      expect(data.count).toBe(2);
      expect(mockReviewService.getReviewQueue).toHaveBeenCalledWith(10);
    });

    it('should handle different limit parameter', async () => {
      mockReviewService.getReviewQueue.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/reviews/queue?limit=25');
      const response = await getQueue(request);

      expect(response.status).toBe(200);
      expect(mockReviewService.getReviewQueue).toHaveBeenCalledWith(25);
    });

    it('should handle service errors', async () => {
      mockReviewService.getReviewQueue.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/reviews/queue');
      const response = await getQueue(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch review queue');
    });
  });

  describe('POST /api/admin/reviews/queue (assign)', () => {
    it('should assign review successfully', async () => {
      mockReviewService.assignReview.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/admin/reviews/queue', {
        method: 'POST',
        body: JSON.stringify({
          queueId: 'queue_123',
          reviewerId: 'reviewer_456'
        })
      });

      const response = await assignReview(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockReviewService.assignReview).toHaveBeenCalledWith('queue_123', 'reviewer_456');
    });

    it('should use auth userId if no reviewerId provided', async () => {
      mockReviewService.assignReview.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/admin/reviews/queue', {
        method: 'POST',
        body: JSON.stringify({
          queueId: 'queue_123'
        })
      });

      const response = await assignReview(request);

      expect(response.status).toBe(200);
      expect(mockReviewService.assignReview).toHaveBeenCalledWith('queue_123', 'admin_user_123');
    });

    it('should return error if queueId missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/reviews/queue', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await assignReview(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('queueId is required');
    });

    it('should handle assignment failure', async () => {
      mockReviewService.assignReview.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/reviews/queue', {
        method: 'POST',
        body: JSON.stringify({
          queueId: 'queue_123'
        })
      });

      const response = await assignReview(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to assign review');
    });
  });

  describe('POST /api/admin/reviews/submit', () => {
    it('should submit review successfully', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/admin/reviews/submit', {
        method: 'POST',
        body: JSON.stringify(reviewData)
      });

      const response = await submitReview(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockReviewService.submitHumanReview).toHaveBeenCalledWith(
        'queue_123',
        'session_456',
        expect.objectContaining({
          scores: reviewData.scores,
          flags: reviewData.flags,
          humanNotes: reviewData.humanNotes,
          tags: reviewData.tags
        })
      );
    });

    it('should validate score ranges', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          queueId: 'queue_123',
          sessionId: 'session_456',
          scores: {
            pedagogicalEffectiveness: 150 // Invalid: > 100
          }
        })
      });

      const response = await submitReview(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('must be between 0 and 100');
    });

    it('should require queueId and sessionId', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          scores: {}
        })
      });

      const response = await submitReview(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('queueId and sessionId are required');
    });

    it('should handle submission errors', async () => {
      mockReviewService.submitHumanReview.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          queueId: 'queue_123',
          sessionId: 'session_456'
        })
      });

      const response = await submitReview(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to submit review');
    });
  });

  describe('GET /api/admin/reviews/stats', () => {
    it('should return review statistics', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/admin/reviews/stats?days=7');
      const response = await getStats(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject(mockStats);
      expect(data.period).toBe('7 days');
      expect(mockReviewService.getReviewStats).toHaveBeenCalledWith(7);
    });

    it('should handle custom day ranges', async () => {
      mockReviewService.getReviewStats.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/admin/reviews/stats?days=30');
      await getStats(request);

      expect(mockReviewService.getReviewStats).toHaveBeenCalledWith(30);
    });

    it('should handle stats fetch failure', async () => {
      mockReviewService.getReviewStats.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/reviews/stats');
      const response = await getStats(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch statistics');
    });

    it('should handle service errors', async () => {
      mockReviewService.getReviewStats.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/reviews/stats');
      const response = await getStats(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch review statistics');
    });
  });
});