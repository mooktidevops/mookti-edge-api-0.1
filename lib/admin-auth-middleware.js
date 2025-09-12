"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdminAuth = verifyAdminAuth;
exports.withAdminAuth = withAdminAuth;
const server_1 = require("next/server");
const auth_middleware_1 = require("./auth-middleware");
const admin_auth_service_1 = require("../src/services/admin-auth-service");
async function verifyAdminAuth(request, requiredPermissions) {
    try {
        // First verify basic authentication
        const authResult = await (0, auth_middleware_1.verifyApiAuth)(request);
        if (!authResult || !authResult.userId) {
            return {
                authenticated: false,
                isAdmin: false,
                error: 'Not authenticated'
            };
        }
        // Check admin access
        const adminResult = await admin_auth_service_1.adminAuthService.checkAdminAccess(authResult.userId);
        if (!adminResult.isAdmin) {
            return {
                authenticated: true,
                isAdmin: false,
                userId: authResult.userId,
                error: 'Not an admin user'
            };
        }
        // Check required permissions if specified
        if (requiredPermissions && requiredPermissions.length > 0) {
            const hasPermission = admin_auth_service_1.adminAuthService.hasAllPermissions(adminResult.permissions || [], requiredPermissions);
            if (!hasPermission) {
                return {
                    authenticated: true,
                    isAdmin: true,
                    userId: authResult.userId,
                    adminUser: adminResult.adminUser,
                    permissions: adminResult.permissions,
                    role: adminResult.role,
                    error: 'Insufficient permissions'
                };
            }
        }
        return {
            authenticated: true,
            isAdmin: true,
            userId: authResult.userId,
            adminUser: adminResult.adminUser,
            permissions: adminResult.permissions,
            role: adminResult.role
        };
    }
    catch (error) {
        console.error('Admin auth verification error:', error);
        return {
            authenticated: false,
            isAdmin: false,
            error: 'Authentication error'
        };
    }
}
// Helper function to create admin-protected API route handlers
function withAdminAuth(handler, requiredPermissions) {
    return async (request) => {
        const auth = await verifyAdminAuth(request, requiredPermissions);
        if (!auth.authenticated) {
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!auth.isAdmin) {
            return server_1.NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
        if (auth.error === 'Insufficient permissions') {
            return server_1.NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
        // Log admin action
        try {
            const url = new URL(request.url);
            const method = request.method;
            const path = url.pathname;
            await admin_auth_service_1.adminAuthService.logAdminAction(auth.userId, `${method} ${path}`, 'api_request', undefined, {
                method,
                path,
                query: Object.fromEntries(url.searchParams)
            }, request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined, request.headers.get('user-agent') || undefined);
        }
        catch (error) {
            console.error('Failed to log admin action:', error);
        }
        return handler(request, auth);
    };
}
