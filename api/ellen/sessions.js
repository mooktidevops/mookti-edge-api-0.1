"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
exports.POST = POST;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const ellen_session_storage_1 = require("../../lib/storage/ellen-session-storage");
const auth_middleware_1 = require("../../lib/auth-middleware");
exports.runtime = 'edge';
const sessionStorage = new ellen_session_storage_1.EllenSessionStorage();
// GET /api/ellen/sessions - Get user's sessions
// POST /api/ellen/sessions - Create new session
// GET /api/ellen/sessions/[id] - Get specific session
// PUT /api/ellen/sessions/[id] - Update session
// DELETE /api/ellen/sessions/[id] - Delete session
async function GET(request) {
    // Verify authentication
    const auth = await (0, auth_middleware_1.verifyApiAuth)(request);
    if (!auth.success) {
        return (0, auth_middleware_1.unauthorizedResponse)(auth.error);
    }
    try {
        const url = new URL(request.url);
        // Get user's sessions
        const userId = url.searchParams.get('userId');
        if (!userId) {
            return server_1.NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }
        const type = url.searchParams.get('type');
        const status = url.searchParams.get('status');
        const recent = url.searchParams.get('recent') === 'true';
        let sessions;
        if (recent) {
            sessions = await sessionStorage.getRecentSessions(userId, 5);
        }
        else {
            sessions = await sessionStorage.getUserSessions(userId, {
                type,
                status
            });
        }
        return server_1.NextResponse.json({ sessions });
    }
    catch (error) {
        console.error('Session GET error:', error);
        return server_1.NextResponse.json({ error: 'Failed to retrieve sessions' }, { status: 500 });
    }
}
async function POST(request) {
    // Verify authentication
    const auth = await (0, auth_middleware_1.verifyApiAuth)(request);
    if (!auth.success) {
        return (0, auth_middleware_1.unauthorizedResponse)(auth.error);
    }
    try {
        const body = await request.json();
        if (!body.userId) {
            return server_1.NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }
        const session = await sessionStorage.createSession({
            id: body.id, // Pass custom ID if provided
            userId: body.userId,
            type: body.type || 'study',
            title: body.title,
            context: body.context,
            sessionGoal: body.sessionGoal,
            resumeFromId: body.resumeFromId
        });
        return server_1.NextResponse.json(session, { status: 201 });
    }
    catch (error) {
        console.error('Session creation error:', error);
        return server_1.NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}
async function PUT(request) {
    // Verify authentication
    const auth = await (0, auth_middleware_1.verifyApiAuth)(request);
    if (!auth.success) {
        return (0, auth_middleware_1.unauthorizedResponse)(auth.error);
    }
    try {
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        const sessionId = pathSegments[pathSegments.length - 1];
        if (!sessionId || sessionId === 'sessions') {
            return server_1.NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }
        const body = await request.json();
        // Handle special actions
        if (body.action) {
            switch (body.action) {
                case 'pause':
                    const paused = await sessionStorage.pauseSession(sessionId);
                    return server_1.NextResponse.json({ success: paused });
                case 'resume':
                    const resumed = await sessionStorage.resumeSession(sessionId);
                    return server_1.NextResponse.json(resumed || { error: 'Session not found' });
                case 'complete':
                    const completed = await sessionStorage.completeSession(sessionId, {
                        keyTakeaways: body.keyTakeaways,
                        confidenceRating: body.confidenceRating,
                        understandingRating: body.understandingRating,
                        difficultyRating: body.difficultyRating
                    });
                    return server_1.NextResponse.json(completed || { error: 'Session not found' });
                default:
                    return server_1.NextResponse.json({ error: 'Invalid action' }, { status: 400 });
            }
        }
        // Regular update
        const updated = await sessionStorage.updateSession(sessionId, body);
        if (!updated) {
            return server_1.NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        return server_1.NextResponse.json(updated);
    }
    catch (error) {
        console.error('Session update error:', error);
        return server_1.NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }
}
async function DELETE(request) {
    // Verify authentication
    const auth = await (0, auth_middleware_1.verifyApiAuth)(request);
    if (!auth.success) {
        return (0, auth_middleware_1.unauthorizedResponse)(auth.error);
    }
    try {
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        const sessionId = pathSegments[pathSegments.length - 1];
        if (!sessionId || sessionId === 'sessions') {
            return server_1.NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }
        const deleted = await sessionStorage.deleteSession(sessionId);
        return server_1.NextResponse.json({ success: deleted });
    }
    catch (error) {
        console.error('Session delete error:', error);
        return server_1.NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }
}
