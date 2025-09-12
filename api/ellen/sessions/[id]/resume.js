"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const ellen_session_storage_1 = require("../../../../lib/storage/ellen-session-storage");
const auth_middleware_1 = require("../../../../lib/auth-middleware");
exports.runtime = 'edge';
const sessionStorage = new ellen_session_storage_1.EllenSessionStorage();
// POST /api/ellen/sessions/[id]/resume - Resume a paused session
async function POST(request) {
    // Verify authentication
    const auth = await (0, auth_middleware_1.verifyApiAuth)(request);
    if (!auth.success) {
        return (0, auth_middleware_1.unauthorizedResponse)(auth.error);
    }
    try {
        // Extract session ID from URL path
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        const sessionIdIndex = pathSegments.indexOf('sessions') + 1;
        if (sessionIdIndex >= pathSegments.length) {
            return server_1.NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }
        const sessionId = pathSegments[sessionIdIndex];
        // Resume the session
        const session = await sessionStorage.resumeSession(sessionId);
        if (!session) {
            return server_1.NextResponse.json({ error: 'Failed to resume session' }, { status: 500 });
        }
        return server_1.NextResponse.json({
            message: 'Session resumed successfully',
            session
        });
    }
    catch (error) {
        console.error('Resume session error:', error);
        return server_1.NextResponse.json({ error: 'Failed to resume session' }, { status: 500 });
    }
}
