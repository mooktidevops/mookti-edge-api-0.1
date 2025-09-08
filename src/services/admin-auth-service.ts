import { db } from '../lib/db';
import { adminUsers, adminAuditLog, ROLE_PERMISSIONS, type AdminRole, type AdminPermission } from '../lib/db/admin-schema';
import { user } from '../lib/db/schema';
import { eq, and } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

export interface AdminAuthResult {
  isAdmin: boolean;
  adminUser?: any;
  permissions?: string[];
  role?: AdminRole;
}

export class AdminAuthService {
  // Check if a user is an admin
  async checkAdminAccess(userId: string): Promise<AdminAuthResult> {
    try {
      const adminUser = await db
        .select()
        .from(adminUsers)
        .where(and(
          eq(adminUsers.userId, userId),
          eq(adminUsers.isActive, true)
        ))
        .limit(1);

      if (adminUser.length === 0) {
        return { isAdmin: false };
      }

      const admin = adminUser[0];
      const role = admin.role as AdminRole;
      
      // Get permissions based on role
      const basePermissions = ROLE_PERMISSIONS[role] || [];
      const customPermissions = admin.permissions || [];
      const allPermissions = [...new Set([...basePermissions, ...customPermissions])];

      // Update last login
      await db
        .update(adminUsers)
        .set({ lastLogin: new Date() })
        .where(eq(adminUsers.id, admin.id));

      return {
        isAdmin: true,
        adminUser: admin,
        permissions: allPermissions,
        role
      };
    } catch (error) {
      console.error('Error checking admin access:', error);
      return { isAdmin: false };
    }
  }

  // Check if admin has specific permission
  hasPermission(permissions: string[], required: AdminPermission): boolean {
    return permissions.includes(required);
  }

  // Check if admin has any of the required permissions
  hasAnyPermission(permissions: string[], required: AdminPermission[]): boolean {
    return required.some(perm => permissions.includes(perm));
  }

  // Check if admin has all required permissions
  hasAllPermissions(permissions: string[], required: AdminPermission[]): boolean {
    return required.every(perm => permissions.includes(perm));
  }

  // Create a new admin user
  async createAdminUser(
    userId: string,
    role: AdminRole,
    createdBy: string,
    customPermissions?: string[]
  ): Promise<boolean> {
    try {
      // Check if user exists
      const userExists = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (userExists.length === 0) {
        throw new Error('User not found');
      }

      // Check if already admin
      const existingAdmin = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.userId, userId))
        .limit(1);

      if (existingAdmin.length > 0) {
        throw new Error('User is already an admin');
      }

      // Create admin user
      await db.insert(adminUsers).values({
        userId,
        role,
        permissions: customPermissions || [],
        isActive: true,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Log the action
      await this.logAdminAction(
        createdBy,
        'admin_created',
        'admin_user',
        userId,
        { role, permissions: customPermissions }
      );

      return true;
    } catch (error) {
      console.error('Error creating admin user:', error);
      return false;
    }
  }

  // Update admin role or permissions
  async updateAdminUser(
    adminId: string,
    updates: {
      role?: AdminRole;
      permissions?: string[];
      isActive?: boolean;
    },
    updatedBy: string
  ): Promise<boolean> {
    try {
      await db
        .update(adminUsers)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(adminUsers.id, adminId));

      // Log the action
      await this.logAdminAction(
        updatedBy,
        'admin_updated',
        'admin_user',
        adminId,
        updates
      );

      return true;
    } catch (error) {
      console.error('Error updating admin user:', error);
      return false;
    }
  }

  // Revoke admin access
  async revokeAdminAccess(adminId: string, revokedBy: string): Promise<boolean> {
    try {
      await db
        .update(adminUsers)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(adminUsers.id, adminId));

      // Log the action
      await this.logAdminAction(
        revokedBy,
        'admin_revoked',
        'admin_user',
        adminId,
        { reason: 'Access revoked' }
      );

      return true;
    } catch (error) {
      console.error('Error revoking admin access:', error);
      return false;
    }
  }

  // Log admin action for audit trail
  async logAdminAction(
    adminUserId: string,
    action: string,
    resourceType?: string,
    resourceId?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // Get admin user ID from user ID
      const admin = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.userId, adminUserId))
        .limit(1);

      if (admin.length > 0) {
        await db.insert(adminAuditLog).values({
          adminUserId: admin[0].id,
          action,
          resourceType,
          resourceId,
          details: details ? JSON.stringify(details) : null,
          ipAddress,
          userAgent,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error logging admin action:', error);
      // Don't throw - logging shouldn't break the main operation
    }
  }

  // Get admin audit log
  async getAuditLog(
    filters?: {
      adminUserId?: string;
      action?: string;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100
  ): Promise<any[]> {
    try {
      let query = db
        .select({
          log: adminAuditLog,
          admin: adminUsers
        })
        .from(adminAuditLog)
        .innerJoin(adminUsers, eq(adminAuditLog.adminUserId, adminUsers.id))
        .limit(limit);

      // Apply filters if provided
      // Note: Drizzle ORM where conditions would need to be built dynamically
      // For now, returning the basic query
      
      return await query;
    } catch (error) {
      console.error('Error fetching audit log:', error);
      return [];
    }
  }

  // Initialize default super admin (run once during setup)
  async initializeSuperAdmin(email: string, password: string): Promise<boolean> {
    try {
      // Check if any admin exists
      const existingAdmins = await db
        .select()
        .from(adminUsers)
        .limit(1);

      if (existingAdmins.length > 0) {
        console.log('Admin users already exist');
        return false;
      }

      // Create user first
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await db
        .insert(user)
        .values({
          email,
          password: hashedPassword
        })
        .returning();

      if (newUser.length > 0) {
        // Create admin user
        await db.insert(adminUsers).values({
          userId: newUser[0].id,
          role: 'super_admin',
          permissions: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        console.log(`Super admin created for ${email}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error initializing super admin:', error);
      return false;
    }
  }
}

// Export singleton instance
export const adminAuthService = new AdminAuthService();