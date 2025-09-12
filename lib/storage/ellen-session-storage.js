"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EllenSessionStorage = void 0;
const kv_1 = require("@vercel/kv");
class EllenSessionStorage {
    SESSION_PREFIX = 'ellen:session:';
    USER_SESSIONS_PREFIX = 'ellen:user:sessions:';
    SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
    // Generate session ID
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    // Generate message ID
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    // Create a new session
    async createSession(request) {
        const sessionId = request.id || this.generateSessionId();
        const now = new Date();
        // If resuming, load the previous session as context
        let previousContext = {};
        let previousMessages = [];
        if (request.resumeFromId) {
            const previousSession = await this.getSession(request.resumeFromId);
            if (previousSession && previousSession.userId === request.userId) {
                previousContext = previousSession.context;
                // Keep last 5 messages as context
                previousMessages = previousSession.messages.slice(-5);
            }
        }
        const session = {
            id: sessionId,
            userId: request.userId,
            type: request.type,
            status: 'active',
            title: request.title || `${request.type} session`,
            startedAt: now,
            lastActiveAt: now,
            totalDuration: 0,
            messages: previousMessages,
            context: { ...previousContext, ...request.context },
            sessionGoal: request.sessionGoal,
            processMetrics: {},
            growthContributions: {}
        };
        // Store session (Vercel KV auto-serializes objects)
        await kv_1.kv.setex(`${this.SESSION_PREFIX}${sessionId}`, this.SESSION_TTL, session);
        // Add to user's session list
        await kv_1.kv.sadd(`${this.USER_SESSIONS_PREFIX}${request.userId}`, sessionId);
        return session;
    }
    // Get a session by ID
    async getSession(sessionId) {
        const data = await kv_1.kv.get(`${this.SESSION_PREFIX}${sessionId}`);
        if (!data)
            return null;
        // Vercel KV auto-deserializes objects
        const session = data;
        // Convert date strings back to Date objects
        session.startedAt = new Date(session.startedAt);
        session.lastActiveAt = new Date(session.lastActiveAt);
        if (session.completedAt) {
            session.completedAt = new Date(session.completedAt);
        }
        session.messages = session.messages.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
        }));
        return session;
    }
    // Update a session
    async updateSession(sessionId, updates) {
        const session = await this.getSession(sessionId);
        if (!session)
            return null;
        const now = new Date();
        const timeSinceLastActive = now.getTime() - session.lastActiveAt.getTime();
        const additionalDuration = Math.min(timeSinceLastActive / (1000 * 60), 120); // Cap at 2 hours
        // Update session fields
        const updatedSession = {
            ...session,
            ...updates,
            lastActiveAt: now,
            totalDuration: session.totalDuration + additionalDuration,
            processMetrics: {
                ...session.processMetrics,
                ...updates.processMetrics
            }
        };
        // If completing the session, set completion time
        if (updates.status === 'completed') {
            updatedSession.completedAt = now;
            // Calculate Growth Compass contributions
            updatedSession.growthContributions = this.calculateGrowthContributions(updatedSession);
        }
        // Store updated session (Vercel KV auto-serializes objects)
        await kv_1.kv.setex(`${this.SESSION_PREFIX}${sessionId}`, this.SESSION_TTL, updatedSession);
        return updatedSession;
    }
    // Add a message to a session
    async addMessage(request) {
        const session = await this.getSession(request.sessionId);
        if (!session)
            return null;
        const message = {
            id: this.generateMessageId(),
            timestamp: new Date(),
            role: request.role,
            content: request.content,
            metadata: request.metadata
        };
        session.messages.push(message);
        session.lastActiveAt = new Date();
        // Update process metrics based on message
        if (message.metadata?.processType) {
            this.updateProcessMetrics(session.processMetrics, message);
        }
        // Store updated session (Vercel KV auto-serializes objects)
        await kv_1.kv.setex(`${this.SESSION_PREFIX}${request.sessionId}`, this.SESSION_TTL, session);
        return message;
    }
    // Get user's sessions with filters
    async getUserSessions(userId, filters) {
        const sessionIds = await kv_1.kv.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`);
        const sessions = [];
        for (const sessionId of sessionIds) {
            const session = await this.getSession(sessionId);
            if (!session)
                continue;
            // Apply filters
            if (filters) {
                if (filters.type && session.type !== filters.type)
                    continue;
                if (filters.status && session.status !== filters.status)
                    continue;
                if (filters.startDate && session.startedAt < filters.startDate)
                    continue;
                if (filters.endDate && session.startedAt > filters.endDate)
                    continue;
                if (filters.minDuration && session.totalDuration < filters.minDuration)
                    continue;
            }
            // Create summary
            const summary = {
                id: session.id,
                userId: session.userId,
                type: session.type,
                status: session.status,
                title: session.title,
                startedAt: session.startedAt,
                lastActiveAt: session.lastActiveAt,
                duration: session.totalDuration,
                messageCount: session.messages.length,
                processMetrics: {
                    primaryProcess: session.sessionGoal?.type,
                    completionRate: this.calculateCompletionRate(session)
                }
            };
            sessions.push(summary);
        }
        // Sort by last active date (most recent first)
        sessions.sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
        return sessions;
    }
    // Get recent active sessions for quick resume
    async getRecentSessions(userId, limit = 5) {
        const allSessions = await this.getUserSessions(userId);
        // Filter for active or paused sessions from the last 7 days
        const recentCutoff = new Date();
        recentCutoff.setDate(recentCutoff.getDate() - 7);
        return allSessions
            .filter(s => (s.status === 'active' || s.status === 'paused') &&
            s.lastActiveAt > recentCutoff)
            .slice(0, limit);
    }
    // Pause a session
    async pauseSession(sessionId) {
        const updated = await this.updateSession(sessionId, { status: 'paused' });
        return updated !== null;
    }
    // Resume a session
    async resumeSession(sessionId) {
        return await this.updateSession(sessionId, { status: 'active' });
    }
    // Complete a session with outcomes
    async completeSession(sessionId, outcomes) {
        return await this.updateSession(sessionId, {
            status: 'completed',
            ...outcomes
        });
    }
    // Delete a session
    async deleteSession(sessionId) {
        const session = await this.getSession(sessionId);
        if (!session)
            return false;
        // Remove from storage
        await kv_1.kv.del(`${this.SESSION_PREFIX}${sessionId}`);
        // Remove from user's session list
        await kv_1.kv.srem(`${this.USER_SESSIONS_PREFIX}${session.userId}`, sessionId);
        return true;
    }
    // Private helper methods
    updateProcessMetrics(metrics, message) {
        if (!message.metadata?.processType)
            return;
        switch (message.metadata.processType) {
            case 'retrieval':
                metrics.retrievalAttempts = (metrics.retrievalAttempts || 0) + 1;
                break;
            case 'revision':
                metrics.revisionsCompleted = (metrics.revisionsCompleted || 0) + 1;
                break;
            case 'exploration':
                metrics.conceptsExplored = (metrics.conceptsExplored || 0) + 1;
                break;
        }
        if (message.role === 'user') {
            metrics.questionsAsked = (metrics.questionsAsked || 0) + 1;
        }
    }
    calculateCompletionRate(session) {
        if (!session.sessionGoal)
            return 0;
        let completed = 0;
        let total = 0;
        // Check various completion indicators
        if (session.sessionGoal.targetDuration) {
            total++;
            if (session.totalDuration >= session.sessionGoal.targetDuration * 0.8) {
                completed++;
            }
        }
        if (session.sessionGoal.type === 'retrieval' && session.processMetrics.retrievalAttempts) {
            total++;
            if (session.processMetrics.retrievalAttempts >= 2) {
                completed++;
            }
        }
        if (session.keyTakeaways && session.keyTakeaways.length > 0) {
            total++;
            completed++;
        }
        return total > 0 ? (completed / total) * 100 : 0;
    }
    calculateGrowthContributions(session) {
        const contributions = {};
        // Goal Alignment: Based on completion and duration
        if (session.status === 'completed') {
            contributions.goalAlignment = Math.min(100, (session.totalDuration / 30) * 50 + // 30 min = 50 points
                (session.keyTakeaways?.length || 0) * 10 // Each takeaway = 10 points
            );
        }
        // Process Engagement: Based on process metrics
        contributions.processEngagement = Math.min(100, (session.processMetrics.retrievalAttempts || 0) * 15 +
            (session.processMetrics.revisionsCompleted || 0) * 20 +
            (session.processMetrics.conceptsExplored || 0) * 10 +
            (session.processMetrics.questionsAsked || 0) * 5);
        // Depth Score: Based on focus duration and understanding
        contributions.depthScore = Math.min(100, Math.min(session.totalDuration / 45, 1) * 50 + // 45 min = full duration score
            (session.understandingRating || 0) * 10 // Understanding rating contribution
        );
        // Reflection Quality: Based on takeaways and ratings
        if (session.keyTakeaways && session.keyTakeaways.length > 0) {
            contributions.reflectionQuality = Math.min(100, session.keyTakeaways.length * 20 +
                (session.confidenceRating || 0) * 10);
        }
        return contributions;
    }
}
exports.EllenSessionStorage = EllenSessionStorage;
