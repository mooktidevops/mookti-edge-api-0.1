"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const ellen_session_storage_1 = require("../../../lib/storage/ellen-session-storage");
const auth_middleware_1 = require("../../../lib/auth-middleware");
exports.runtime = 'edge';
const sessionStorage = new ellen_session_storage_1.EllenSessionStorage();
// GET /api/ellen/sessions/[id] - Get specific session
async function GET(request) {
    // Verify authentication
    const auth = await (0, auth_middleware_1.verifyApiAuth)(request);
    if (!auth.success) {
        return (0, auth_middleware_1.unauthorizedResponse)(auth.error);
    }
    try {
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        // Extract session ID from path
        // Pattern: /api/ellen/sessions/{sessionId}
        const sessionId = pathSegments[pathSegments.length - 1];
        if (!sessionId || sessionId === 'sessions') {
            return server_1.NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }
        // Get specific session
        const session = await sessionStorage.getSession(sessionId);
        if (!session) {
            return server_1.NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        return server_1.NextResponse.json(session);
    }
    catch (error) {
        console.error('Session GET error:', error);
        return server_1.NextResponse.json({ error: 'Failed to retrieve session' }, { status: 500 });
    }
}
// DELETE /api/ellen/sessions/[id] - Delete session
async function DELETE(request) {
    // Verify authentication
    const auth = await (0, auth_middleware_1.verifyApiAuth)(request);
    if (!auth.success) {
        return (0, auth_middleware_1.unauthorizedResponse)(auth.error);
    }
    try {
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        // Extract session ID from path
        const sessionId = pathSegments[pathSegments.length - 1];
        if (!sessionId || sessionId === 'sessions') {
            return server_1.NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }
        // Delete the session
        const success = await sessionStorage.deleteSession(sessionId);
        if (!success) {
            return server_1.NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
        }
        return server_1.NextResponse.json({
            message: 'Session deleted successfully',
            sessionId
        });
    }
    catch (error) {
        console.error('Session DELETE error:', error);
        return server_1.NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }
}
