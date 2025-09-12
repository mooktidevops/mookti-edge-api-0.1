"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const ellen_session_storage_1 = require("../../../../lib/storage/ellen-session-storage");
const auth_middleware_1 = require("../../../../lib/auth-middleware");
exports.runtime = 'edge';
const sessionStorage = new ellen_session_storage_1.EllenSessionStorage();
// POST /api/ellen/sessions/[id]/messages - Add message to session
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
        // Parse request body
        const body = await request.json();
        const { role, content, metadata } = body;
        // Validate required fields
        if (!role || !content) {
            return server_1.NextResponse.json({ error: 'Role and content are required' }, { status: 400 });
        }
        if (!['user', 'assistant', 'system'].includes(role)) {
            return server_1.NextResponse.json({ error: 'Invalid role. Must be user, assistant, or system' }, { status: 400 });
        }
        // Add message to session
        const message = await sessionStorage.addMessage({
            sessionId,
            role: role,
            content,
            metadata
        });
        if (!message) {
            return server_1.NextResponse.json({ error: 'Failed to add message to session' }, { status: 500 });
        }
        return server_1.NextResponse.json(message);
    }
    catch (error) {
        console.error('Add message error:', error);
        return server_1.NextResponse.json({ error: 'Failed to add message' }, { status: 500 });
    }
}
// GET /api/ellen/sessions/[id]/messages - Get session messages
async function GET(request) {
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
        // Get session with messages
        const session = await sessionStorage.getSession(sessionId);
        if (!session) {
            return server_1.NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        // Return just the messages
        return server_1.NextResponse.json({
            messages: session.messages || [],
            count: session.messages?.length || 0
        });
    }
    catch (error) {
        console.error('Get messages error:', error);
        return server_1.NextResponse.json({ error: 'Failed to get messages' }, { status: 500 });
    }
}
