"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobProcessor = exports.JobProcessor = void 0;
const job_queue_1 = require("./job-queue");
const growth_compass_storage_1 = __importDefault(require("./storage/growth-compass-storage"));
const pattern_detector_1 = require("../src/services/pattern-detector");
const review_service_1 = require("../src/services/review-service");
const ellen_session_storage_1 = require("./storage/ellen-session-storage");
const sessionStorage = new ellen_session_storage_1.EllenSessionStorage();
const patternDetector = new pattern_detector_1.PatternDetector();
class JobProcessor {
    isProcessing = false;
    processInterval = null;
    start(intervalMs = 5000) {
        if (this.processInterval)
            return;
        this.processInterval = setInterval(() => {
            if (!this.isProcessing) {
                this.processNext();
            }
        }, intervalMs);
        console.log('Job processor started');
    }
    stop() {
        if (this.processInterval) {
            clearInterval(this.processInterval);
            this.processInterval = null;
            console.log('Job processor stopped');
        }
    }
    async processNext() {
        this.isProcessing = true;
        let job;
        try {
            job = await job_queue_1.jobQueue.dequeue();
            if (!job) {
                this.isProcessing = false;
                return;
            }
            console.log(`Processing job ${job.id}: ${job.type}`);
            switch (job.type) {
                case 'growth-compass-update':
                    await this.processGrowthCompassUpdate(job.payload);
                    break;
                case 'pattern-detection':
                    await this.processPatternDetection(job.payload);
                    break;
                case 'milestone-check':
                    await this.processMilestoneCheck(job.payload);
                    break;
                case 'review-trigger':
                    await this.processReviewTrigger(job.payload);
                    break;
                default:
                    throw new Error(`Unknown job type: ${job.type}`);
            }
            await job_queue_1.jobQueue.complete(job.id);
        }
        catch (error) {
            console.error('Job processing error:', error);
            if (job?.id) {
                await job_queue_1.jobQueue.fail(job.id, error.message || 'Processing failed');
            }
        }
        finally {
            this.isProcessing = false;
        }
    }
    async processGrowthCompassUpdate(payload) {
        const session = await sessionStorage.getSession(payload.sessionId);
        if (!session) {
            throw new Error(`Session ${payload.sessionId} not found`);
        }
        const growthData = await growth_compass_storage_1.default.getGrowthCompassData(payload.userId);
        if (!growthData) {
            throw new Error(`Growth data for user ${payload.userId} not found`);
        }
        // Add session to history
        const sessionRecord = {
            id: session.id,
            type: session.type,
            startTime: session.startedAt,
            endTime: session.completedAt || new Date(),
            duration: session.totalDuration,
            processType: session.sessionGoal?.type,
            focusDuration: session.totalDuration,
            performance: payload.understandingRating || 3,
            energy: payload.confidenceRating || 3,
            quality: 70 // Default quality
        };
        growthData.rhythmData.actualSessions.push(sessionRecord);
        // Update Growth Velocity components
        const velocity = growthData.growthVelocity;
        const weight = 0.1; // New session has 10% weight
        if (session.growthContributions?.goalAlignment !== undefined) {
            velocity.components.goalAlignment =
                velocity.components.goalAlignment * (1 - weight) +
                    session.growthContributions.goalAlignment * weight;
        }
        if (session.growthContributions?.processEngagement !== undefined) {
            velocity.components.balanceIndex =
                velocity.components.balanceIndex * (1 - weight) +
                    session.growthContributions.processEngagement * weight;
        }
        if (session.growthContributions?.depthScore !== undefined) {
            velocity.components.depthScore =
                velocity.components.depthScore * (1 - weight) +
                    session.growthContributions.depthScore * weight;
        }
        if (session.growthContributions?.reflectionQuality !== undefined) {
            velocity.components.reflectionQuality =
                velocity.components.reflectionQuality * (1 - weight) +
                    session.growthContributions.reflectionQuality * weight;
        }
        // Recalculate overall velocity score
        velocity.score =
            velocity.components.goalAlignment * 0.30 +
                velocity.components.balanceIndex * 0.20 +
                velocity.components.depthScore * 0.20 +
                velocity.components.recoveryEngagement * 0.15 +
                velocity.components.reflectionQuality * 0.15;
        // Update trend
        const previousScore = growthData.growthVelocity.score;
        if (velocity.score > previousScore + 5) {
            velocity.trend = 'rising';
        }
        else if (velocity.score < previousScore - 5) {
            velocity.trend = 'declining';
        }
        else {
            velocity.trend = 'steady';
        }
        velocity.lastUpdated = new Date();
        // Save updated Growth Compass data
        await growth_compass_storage_1.default.updateGrowthCompassData(payload.userId, growthData);
    }
    async processPatternDetection(payload) {
        // Get recent sessions for pattern detection
        const sessions = await growth_compass_storage_1.default.getSessions(payload.userId, 20);
        if (sessions.length >= 3) {
            // Detect patterns
            const patterns = await patternDetector.detectPatterns(payload.userId, sessions);
            // Store patterns in Growth Compass
            const growthData = await growth_compass_storage_1.default.getGrowthCompassData(payload.userId);
            if (growthData) {
                // Update power patterns
                for (const pattern of patterns) {
                    const existingIndex = growthData.powerPatterns.findIndex(p => p.type === pattern.type);
                    if (existingIndex >= 0) {
                        growthData.powerPatterns[existingIndex] = {
                            ...growthData.powerPatterns[existingIndex],
                            confidence: pattern.confidence,
                            description: pattern.description,
                            lastValidated: new Date()
                        };
                    }
                    else {
                        growthData.powerPatterns.push({
                            id: `pattern-${Date.now()}`,
                            name: pattern.type,
                            confidence: pattern.confidence,
                            discoveredDate: new Date(),
                            validations: 1,
                            isAdopted: false,
                            description: pattern.description
                        });
                    }
                }
                await growth_compass_storage_1.default.updateGrowthCompassData(payload.userId, growthData);
            }
        }
    }
    async processMilestoneCheck(payload) {
        const session = await sessionStorage.getSession(payload.sessionId);
        const growthData = await growth_compass_storage_1.default.getGrowthCompassData(payload.userId);
        if (!session || !growthData)
            return;
        const earned = [];
        // Check for first session milestone
        if (growthData.rhythmData.actualSessions.length === 1) {
            earned.push('getting_started');
        }
        // Check for focus session milestone
        if (session.totalDuration >= 45 && session.type === 'study') {
            earned.push('deep_diver');
        }
        // Check for reflection milestone
        if (payload.keyTakeaways && payload.keyTakeaways.length >= 3) {
            earned.push('reflection_explorer');
        }
        // Check for consistency milestone
        const recentSessions = growthData.rhythmData.actualSessions.slice(-5);
        if (recentSessions.length === 5) {
            const inOptimalWindows = recentSessions.filter((s) => {
                const hour = new Date(s.startTime).getHours();
                return growthData.rhythmData.optimalWindows.some((w) => hour >= w.startHour && hour <= w.endHour);
            });
            if (inOptimalWindows.length >= 3) {
                earned.push('rhythm_finder');
            }
        }
        // Store milestones (you could extend this to track in a separate collection)
        if (earned.length > 0) {
            console.log(`User ${payload.userId} earned milestones:`, earned);
        }
    }
    async processReviewTrigger(payload) {
        const session = await sessionStorage.getSession(payload.sessionId);
        if (!session)
            return;
        const reviewTrigger = await review_service_1.reviewService.analyzeSessionForReview(session);
        if (reviewTrigger.shouldReview) {
            await review_service_1.reviewService.addToReviewQueue(payload.sessionId, reviewTrigger, {
                userId: payload.userId,
                sessionType: payload.sessionType,
                messageCount: payload.messageCount,
                duration: payload.duration,
                userRatings: payload.userRatings
            });
            console.log(`Session ${payload.sessionId} added to review queue with priority ${reviewTrigger.priority}`);
        }
    }
}
exports.JobProcessor = JobProcessor;
exports.jobProcessor = new JobProcessor();
