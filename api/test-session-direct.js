"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const ellen_session_storage_1 = require("../lib/storage/ellen-session-storage");
exports.runtime = 'edge';
const sessionStorage = new ellen_session_storage_1.EllenSessionStorage();
// TEST ENDPOINT - Remove before production
async function GET(request) {
    try {
        // Create a test session directly
        const session = await sessionStorage.createSession({
            userId: 'test-user-preview',
            type: 'study',
            title: 'Direct Test Session',
            context: {
                timestamp: new Date().toISOString()
            }
        });
        return server_1.NextResponse.json({
            success: true,
            message: 'Session storage is working!',
            session: {
                id: session.id,
                type: session.type,
                status: session.status,
                title: session.title
            }
        });
    }
    catch (error) {
        return server_1.NextResponse.json({
            success: false,
            error: error.message || 'Unknown error',
            stack: error.stack
        }, { status: 500 });
    }
}
