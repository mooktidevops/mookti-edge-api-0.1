"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const ellen_session_storage_1 = require("../../../lib/storage/ellen-session-storage");
const job_queue_1 = require("../../../lib/job-queue");
exports.runtime = 'edge';
const sessionStorage = new ellen_session_storage_1.EllenSessionStorage();
// POST /api/ellen/sessions/complete - Complete a session and update Growth Compass
async function POST(request) {
    try {
        const body = await request.json();
        const { sessionId, keyTakeaways, confidenceRating, understandingRating, difficultyRating, nextIntention } = body;
        if (!sessionId) {
            return server_1.NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
        }
        // Get the session before completing it
        const session = await sessionStorage.getSession(sessionId);
        if (!session) {
            return server_1.NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        // Complete the session
        const completedSession = await sessionStorage.completeSession(sessionId, {
            keyTakeaways,
            confidenceRating,
            understandingRating,
            difficultyRating
        });
        if (!completedSession) {
            return server_1.NextResponse.json({ error: 'Failed to complete session' }, { status: 500 });
        }
        // Queue background jobs for async processing
        const jobPromises = [];
        // Queue review trigger job
        if (completedSession.userId) {
            jobPromises.push(job_queue_1.jobQueue.enqueue('review-trigger', {
                sessionId: completedSession.id,
                userId: completedSession.userId,
                sessionType: completedSession.type,
                messageCount: completedSession.messages.length,
                duration: completedSession.totalDuration,
                userRatings: {
                    confidence: confidenceRating,
                    understanding: understandingRating,
                    difficulty: difficultyRating
                }
            }));
        }
        // Queue Growth Compass update job
        if (completedSession.userId && completedSession.growthContributions) {
            jobPromises.push(job_queue_1.jobQueue.enqueue('growth-compass-update', {
                sessionId: completedSession.id,
                userId: completedSession.userId,
                keyTakeaways,
                confidenceRating,
                understandingRating,
                difficultyRating
            }));
        }
        // Queue pattern detection job
        if (completedSession.userId) {
            jobPromises.push(job_queue_1.jobQueue.enqueue('pattern-detection', {
                userId: completedSession.userId,
                sessionId: completedSession.id
            }));
        }
        // Queue milestone check job
        if (completedSession.userId) {
            jobPromises.push(job_queue_1.jobQueue.enqueue('milestone-check', {
                sessionId: completedSession.id,
                userId: completedSession.userId,
                keyTakeaways
            }));
        }
        // Wait for all jobs to be enqueued (but not processed)
        const jobIds = await Promise.all(jobPromises);
        // Generate next suggestion synchronously (it's quick)
        const nextSuggestion = generateNextSuggestion(completedSession, { trend: 'steady' });
        // Return immediate response with processing status
        return server_1.NextResponse.json({
            session: completedSession,
            status: 'processing',
            jobIds,
            nextSuggestion,
            message: 'Session completed successfully. Growth metrics are being calculated in the background.'
        });
    }
    catch (error) {
        console.error('Session completion error:', error);
        return server_1.NextResponse.json({ error: 'Failed to complete session' }, { status: 500 });
    }
}
// Helper function to generate next session suggestion
function generateNextSuggestion(session, velocity) {
    const suggestion = {};
    // Suggest based on current velocity trend
    if (velocity.trend === 'declining') {
        suggestion.type = 'reflection';
        suggestion.focus = 'Review and consolidate recent learning';
        suggestion.duration = 20;
    }
    else if (session.type === 'study') {
        suggestion.type = 'retrieval';
        suggestion.focus = 'Practice recall of today\'s material';
        suggestion.duration = 15;
    }
    else if (session.type === 'writing') {
        suggestion.type = 'revision';
        suggestion.focus = 'Revise and polish your draft';
        suggestion.duration = 30;
    }
    else {
        suggestion.type = 'study';
        suggestion.focus = 'Continue with your learning plan';
        suggestion.duration = 25;
    }
    return suggestion;
}
