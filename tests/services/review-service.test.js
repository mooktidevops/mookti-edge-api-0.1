"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const review_service_1 = require("../../src/services/review-service");
// Mock the database
globals_1.jest.mock('../../src/lib/db', () => ({
    db: {
        insert: globals_1.jest.fn().mockReturnValue({
            values: globals_1.jest.fn().mockResolvedValue(true)
        }),
        select: globals_1.jest.fn().mockReturnValue({
            from: globals_1.jest.fn().mockReturnValue({
                where: globals_1.jest.fn().mockReturnValue({
                    orderBy: globals_1.jest.fn().mockReturnValue({
                        limit: globals_1.jest.fn().mockResolvedValue([])
                    }),
                    limit: globals_1.jest.fn().mockResolvedValue([])
                })
            })
        }),
        update: globals_1.jest.fn().mockReturnValue({
            set: globals_1.jest.fn().mockReturnValue({
                where: globals_1.jest.fn().mockResolvedValue(true)
            })
        })
    }
}));
(0, globals_1.describe)('ConversationReviewService', () => {
    let reviewService;
    (0, globals_1.beforeEach)(() => {
        reviewService = new review_service_1.ConversationReviewService();
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('analyzeSessionForReview', () => {
        const createMockSession = (overrides) => ({
            id: 'session_123',
            userId: 'user_456',
            type: 'study',
            status: 'completed',
            title: 'Test Session',
            startedAt: new Date(),
            lastActiveAt: new Date(),
            completedAt: new Date(),
            totalDuration: 1800,
            messages: [],
            context: {},
            processMetrics: {},
            growthContributions: {},
            ...overrides
        });
        (0, globals_1.it)('should trigger high priority review for high frustration', async () => {
            const session = createMockSession({
                messages: [
                    {
                        id: '1',
                        role: 'user',
                        content: "I don't understand this at all",
                        timestamp: new Date(),
                        metadata: {}
                    },
                    {
                        id: '2',
                        role: 'user',
                        content: "This doesn't make sense, I'm confused",
                        timestamp: new Date(),
                        metadata: {}
                    },
                    {
                        id: '3',
                        role: 'user',
                        content: "What? I'm lost",
                        timestamp: new Date(),
                        metadata: {}
                    }
                ]
            });
            const result = await reviewService.analyzeSessionForReview(session);
            (0, globals_1.expect)(result.shouldReview).toBe(true);
            (0, globals_1.expect)(result.priority).toBeGreaterThanOrEqual(80);
            (0, globals_1.expect)(result.triggerType).toBe('frustration');
            (0, globals_1.expect)(result.reason).toContain('High frustration detected');
        });
        (0, globals_1.it)('should trigger review for early abandonment', async () => {
            const session = createMockSession({
                messages: [
                    { id: '1', role: 'user', content: 'Hello', timestamp: new Date(), metadata: {} },
                    { id: '2', role: 'assistant', content: 'Hi there!', timestamp: new Date(), metadata: {} },
                    { id: '3', role: 'user', content: 'Bye', timestamp: new Date(), metadata: {} }
                ],
                status: 'completed'
            });
            const result = await reviewService.analyzeSessionForReview(session);
            (0, globals_1.expect)(result.shouldReview).toBe(true);
            (0, globals_1.expect)(result.priority).toBeGreaterThanOrEqual(85);
            (0, globals_1.expect)(result.triggerType).toBe('abandonment');
            (0, globals_1.expect)(result.reason).toBe('Session abandoned early');
        });
        (0, globals_1.it)('should trigger review for tool thrashing', async () => {
            const session = createMockSession({
                messages: [
                    { id: '1', role: 'assistant', content: 'Using tool A', timestamp: new Date(), metadata: { tool: 'toolA' } },
                    { id: '2', role: 'assistant', content: 'Using tool B', timestamp: new Date(), metadata: { tool: 'toolB' } },
                    { id: '3', role: 'assistant', content: 'Using tool C', timestamp: new Date(), metadata: { tool: 'toolC' } },
                    { id: '4', role: 'assistant', content: 'Using tool D', timestamp: new Date(), metadata: { tool: 'toolD' } },
                    { id: '5', role: 'assistant', content: 'Using tool E', timestamp: new Date(), metadata: { tool: 'toolE' } }
                ]
            });
            const result = await reviewService.analyzeSessionForReview(session);
            (0, globals_1.expect)(result.shouldReview).toBe(true);
            (0, globals_1.expect)(result.priority).toBeGreaterThanOrEqual(80);
            (0, globals_1.expect)(result.triggerType).toBe('tool_thrashing');
            (0, globals_1.expect)(result.reason).toBe('Excessive tool switching detected');
        });
        (0, globals_1.it)('should detect success indicators', async () => {
            const session = createMockSession({
                messages: [
                    { id: '1', role: 'user', content: 'That makes perfect sense!', timestamp: new Date(), metadata: {} },
                    { id: '2', role: 'user', content: 'Thanks, I understand now', timestamp: new Date(), metadata: {} },
                    { id: '3', role: 'user', content: 'Got it, this is clear', timestamp: new Date(), metadata: {} }
                ]
            });
            const result = await reviewService.analyzeSessionForReview(session);
            // Success sessions have low priority and are rarely sampled
            if (result.shouldReview) {
                (0, globals_1.expect)(result.priority).toBeLessThanOrEqual(30);
                (0, globals_1.expect)(result.triggerType).toBe('success_sample');
            }
        });
        (0, globals_1.it)('should detect abandonment risk from long pauses', async () => {
            const now = new Date();
            const twoMinutesAgo = new Date(now.getTime() - 150000); // 2.5 minutes
            const session = createMockSession({
                messages: [
                    { id: '1', role: 'user', content: 'Help me', timestamp: twoMinutesAgo, metadata: {} },
                    { id: '2', role: 'assistant', content: 'Sure!', timestamp: now, metadata: {} }
                ]
            });
            const result = await reviewService.analyzeSessionForReview(session);
            // The extractQualitySignals should detect abandonment risk
            const signals = reviewService.extractQualitySignals(session);
            (0, globals_1.expect)(signals.abandonmentRisk).toBe(true);
        });
    });
    (0, globals_1.describe)('addToReviewQueue', () => {
        (0, globals_1.it)('should add session to review queue', async () => {
            const trigger = {
                shouldReview: true,
                priority: 90,
                reason: 'High frustration',
                triggerType: 'frustration'
            };
            await (0, globals_1.expect)(reviewService.addToReviewQueue('session_123', trigger, { userId: 'user_456' })).resolves.not.toThrow();
        });
        (0, globals_1.it)('should handle database errors gracefully', async () => {
            const db = require('../../src/lib/db').db;
            db.insert.mockImplementationOnce(() => {
                throw new Error('Database error');
            });
            const trigger = {
                shouldReview: true,
                priority: 90,
                reason: 'High frustration',
                triggerType: 'frustration'
            };
            await (0, globals_1.expect)(reviewService.addToReviewQueue('session_123', trigger)).rejects.toThrow('Database error');
        });
    });
    (0, globals_1.describe)('getReviewQueue', () => {
        (0, globals_1.it)('should fetch pending reviews sorted by priority', async () => {
            const mockQueue = [
                { id: '1', priority: 90, status: 'pending' },
                { id: '2', priority: 80, status: 'pending' }
            ];
            const db = require('../../src/lib/db').db;
            db.select.mockReturnValueOnce({
                from: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockReturnValue({
                        orderBy: globals_1.jest.fn().mockReturnValue({
                            limit: globals_1.jest.fn().mockResolvedValue(mockQueue)
                        })
                    })
                })
            });
            const queue = await reviewService.getReviewQueue(10);
            (0, globals_1.expect)(queue).toEqual(mockQueue);
        });
        (0, globals_1.it)('should return empty array on error', async () => {
            const db = require('../../src/lib/db').db;
            db.select.mockImplementationOnce(() => {
                throw new Error('Database error');
            });
            const queue = await reviewService.getReviewQueue(10);
            (0, globals_1.expect)(queue).toEqual([]);
        });
    });
    (0, globals_1.describe)('submitHumanReview', () => {
        (0, globals_1.it)('should create review and update queue status', async () => {
            const review = {
                scores: {
                    pedagogicalEffectiveness: 85,
                    studentEngagement: 75,
                    conceptualClarity: 80
                },
                flags: {
                    learningObjectiveMet: true,
                    frustrationHandledWell: false,
                    needsEscalation: false
                },
                humanNotes: 'Good session overall',
                tags: ['excellent', 'minor-confusion']
            };
            await (0, globals_1.expect)(reviewService.submitHumanReview('queue_123', 'session_456', review)).resolves.not.toThrow();
        });
        (0, globals_1.it)('should update patterns when issues are found', async () => {
            const review = {
                scores: {},
                flags: {},
                issues: [
                    { type: 'tool_failure', severity: 'high', description: 'Tool crashed' }
                ]
            };
            const db = require('../../src/lib/db').db;
            // Mock pattern lookup
            db.select.mockReturnValueOnce({
                from: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockReturnValue({
                        limit: globals_1.jest.fn().mockResolvedValue([
                            { id: 'pattern_1', frequency: 5, sessions: [] }
                        ])
                    })
                })
            });
            await reviewService.submitHumanReview('queue_123', 'session_456', review);
            // Verify pattern update was attempted
            (0, globals_1.expect)(db.update).toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('getReviewStats', () => {
        (0, globals_1.it)('should aggregate review statistics', async () => {
            const mockMetrics = [
                { date: new Date(), totalSessions: 100, reviewedSessions: 45 }
            ];
            const mockReviews = [
                { pedagogicalEffectiveness: 80, studentEngagement: 85, needsEscalation: false },
                { pedagogicalEffectiveness: 75, studentEngagement: 70, needsEscalation: true }
            ];
            const mockPatterns = [
                { patternType: 'confusion', frequency: 10 }
            ];
            const db = require('../../src/lib/db').db;
            // Mock all three queries
            let callCount = 0;
            db.select.mockImplementation(() => ({
                from: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockImplementation(() => {
                        if (callCount === 0) {
                            callCount++;
                            return {
                                orderBy: globals_1.jest.fn().mockResolvedValue(mockMetrics)
                            };
                        }
                        else if (callCount === 1) {
                            callCount++;
                            return Promise.resolve(mockReviews);
                        }
                        else {
                            return {
                                orderBy: globals_1.jest.fn().mockResolvedValue(mockPatterns)
                            };
                        }
                    })
                })
            }));
            const stats = await reviewService.getReviewStats(7);
            (0, globals_1.expect)(stats).toHaveProperty('dailyMetrics');
            (0, globals_1.expect)(stats).toHaveProperty('totalReviews');
            (0, globals_1.expect)(stats).toHaveProperty('averageScores');
            (0, globals_1.expect)(stats).toHaveProperty('activePatterns');
            (0, globals_1.expect)(stats.totalReviews).toBe(2);
            (0, globals_1.expect)(stats.averageScores.pedagogical).toBe(77.5);
        });
    });
});
