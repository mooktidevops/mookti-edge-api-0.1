import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from './auth-middleware';
import { adminAuthService } from '../src/services/admin-auth-service';
import { ADMIN_PERMISSIONS, type AdminPermission } from '../src/lib/db/admin-schema';

export interface AdminAuthResult {
  authenticated: boolean;
  isAdmin: boolean;
  userId?: string;
  adminUser?: any;
  permissions?: string[];
  role?: string;
  error?: string;
}

export async function verifyAdminAuth(
  request: NextRequest,
  requiredPermissions?: AdminPermission[]
): Promise<AdminAuthResult> {
  try {
    // First verify basic authentication
    const authResult = await verifyApiAuth(request);
    
    if (!authResult || !authResult.userId) {
      return {
        authenticated: false,
        isAdmin: false,
        error: 'Not authenticated'
      };
    }

    // Check admin access
    const adminResult = await adminAuthService.checkAdminAccess(authResult.userId);
    
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
      const hasPermission = adminAuthService.hasAllPermissions(
        adminResult.permissions || [],
        requiredPermissions
      );
      
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
  } catch (error) {
    console.error('Admin auth verification error:', error);
    return {
      authenticated: false,
      isAdmin: false,
      error: 'Authentication error'
    };
  }
}

// Helper function to create admin-protected API route handlers
export function withAdminAuth(
  handler: (request: NextRequest, auth: AdminAuthResult) => Promise<NextResponse>,
  requiredPermissions?: AdminPermission[]
) {
  return async (request: NextRequest) => {
    const auth = await verifyAdminAuth(request, requiredPermissions);
    
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (!auth.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    if (auth.error === 'Insufficient permissions') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Log admin action
    try {
      const url = new URL(request.url);
      const method = request.method;
      const path = url.pathname;
      
      await adminAuthService.logAdminAction(
        auth.userId!,
        `${method} ${path}`,
        'api_request',
        undefined,
        {
          method,
          path,
          query: Object.fromEntries(url.searchParams)
        },
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        request.headers.get('user-agent') || undefined
      );
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }
    
    return handler(request, auth);
  };
}