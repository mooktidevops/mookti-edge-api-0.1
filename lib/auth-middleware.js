"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyApiAuth = verifyApiAuth;
exports.unauthorizedResponse = unauthorizedResponse;
const server_1 = require("next/server");
const dev_mode_1 = require("./config/dev-mode");
const auth_native_1 = require("./auth-native");
// TEMPORARY: Simple API key authentication for preview deployment
// TODO: Replace with Firebase auth before production launch (see MOOKTI_COMPREHENSIVE_DEV_PLAN_V5.md)
async function verifyApiAuth(request) {
    // Dev mode bypass
    if ((0, dev_mode_1.isDevMode)(request)) {
        const devUserId = request.headers.get('X-Dev-User-Id');
        const devUser = (0, dev_mode_1.getDevUser)(request);
        return {
            success: true,
            userId: devUserId || (devUser ? devUser.id : 'dev-user-default')
        };
    }
    // Check for API key in Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return { success: false, error: 'Missing Authorization header' };
    }
    // Accept API key for preview and service calls
    const apiKey = process.env.MOOKTI_API_KEY || 'mookti-preview-key-2025';
    if (authHeader === `Bearer ${apiKey}`) {
        return { success: true, userId: 'preview-user-001' };
    }
    // Otherwise treat as Firebase ID token
    try {
        const result = await (0, auth_native_1.verifyFirebaseToken)(authHeader);
        if (result.success) {
            return { success: true, userId: result.userId };
        }
        return { success: false, error: String(result.error || 'Invalid token') };
    }
    catch (e) {
        return { success: false, error: e?.message || 'Auth verification failed' };
    }
}
// Helper to create unauthorized response
function unauthorizedResponse(error = 'Unauthorized') {
    return server_1.NextResponse.json({ error }, {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Bearer realm="Mookti API"'
        }
    });
}
// TODO: Production implementation should use this instead:
// import { verifyFirebaseToken } from './auth-native';
// export async function verifyApiAuth(request: NextRequest) {
//   const authHeader = request.headers.get('Authorization');
//   return await verifyFirebaseToken(authHeader);
// }
