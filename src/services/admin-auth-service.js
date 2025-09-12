"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuthService = exports.AdminAuthService = void 0;
const db_1 = require("../lib/db");
const admin_schema_1 = require("../lib/db/admin-schema");
const schema_1 = require("../lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt = __importStar(require("bcryptjs"));
class AdminAuthService {
    // Check if a user is an admin
    async checkAdminAccess(userId) {
        try {
            const adminUser = await db_1.db
                .select()
                .from(admin_schema_1.adminUsers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(admin_schema_1.adminUsers.userId, userId), (0, drizzle_orm_1.eq)(admin_schema_1.adminUsers.isActive, true)))
                .limit(1);
            if (adminUser.length === 0) {
                return { isAdmin: false };
            }
            const admin = adminUser[0];
            const role = admin.role;
            // Get permissions based on role
            const basePermissions = admin_schema_1.ROLE_PERMISSIONS[role] || [];
            const customPermissions = admin.permissions || [];
            const allPermissions = [...new Set([...basePermissions, ...customPermissions])];
            // Update last login
            await db_1.db
                .update(admin_schema_1.adminUsers)
                .set({ lastLogin: new Date() })
                .where((0, drizzle_orm_1.eq)(admin_schema_1.adminUsers.id, admin.id));
            return {
                isAdmin: true,
                adminUser: admin,
                permissions: allPermissions,
                role
            };
        }
        catch (error) {
            console.error('Error checking admin access:', error);
            return { isAdmin: false };
        }
    }
    // Check if admin has specific permission
    hasPermission(permissions, required) {
        return permissions.includes(required);
    }
    // Check if admin has any of the required permissions
    hasAnyPermission(permissions, required) {
        return required.some(perm => permissions.includes(perm));
    }
    // Check if admin has all required permissions
    hasAllPermissions(permissions, required) {
        return required.every(perm => permissions.includes(perm));
    }
    // Create a new admin user
    async createAdminUser(userId, role, createdBy, customPermissions) {
        try {
            // Check if user exists
            const userExists = await db_1.db
                .select()
                .from(schema_1.user)
                .where((0, drizzle_orm_1.eq)(schema_1.user.id, userId))
                .limit(1);
            if (userExists.length === 0) {
                throw new Error('User not found');
            }
            // Check if already admin
            const existingAdmin = await db_1.db
                .select()
                .from(admin_schema_1.adminUsers)
                .where((0, drizzle_orm_1.eq)(admin_schema_1.adminUsers.userId, userId))
                .limit(1);
            if (existingAdmin.length > 0) {
                throw new Error('User is already an admin');
            }
            // Create admin user
            await db_1.db.insert(admin_schema_1.adminUsers).values({
                userId,
                role,
                permissions: customPermissions || [],
                isActive: true,
                createdBy,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            // Log the action
            await this.logAdminAction(createdBy, 'admin_created', 'admin_user', userId, { role, permissions: customPermissions });
            return true;
        }
        catch (error) {
            console.error('Error creating admin user:', error);
            return false;
        }
    }
    // Update admin role or permissions
    async updateAdminUser(adminId, updates, updatedBy) {
        try {
            await db_1.db
                .update(admin_schema_1.adminUsers)
                .set({
                ...updates,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.eq)(admin_schema_1.adminUsers.id, adminId));
            // Log the action
            await this.logAdminAction(updatedBy, 'admin_updated', 'admin_user', adminId, updates);
            return true;
        }
        catch (error) {
            console.error('Error updating admin user:', error);
            return false;
        }
    }
    // Revoke admin access
    async revokeAdminAccess(adminId, revokedBy) {
        try {
            await db_1.db
                .update(admin_schema_1.adminUsers)
                .set({
                isActive: false,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.eq)(admin_schema_1.adminUsers.id, adminId));
            // Log the action
            await this.logAdminAction(revokedBy, 'admin_revoked', 'admin_user', adminId, { reason: 'Access revoked' });
            return true;
        }
        catch (error) {
            console.error('Error revoking admin access:', error);
            return false;
        }
    }
    // Log admin action for audit trail
    async logAdminAction(adminUserId, action, resourceType, resourceId, details, ipAddress, userAgent) {
        try {
            // Get admin user ID from user ID
            const admin = await db_1.db
                .select()
                .from(admin_schema_1.adminUsers)
                .where((0, drizzle_orm_1.eq)(admin_schema_1.adminUsers.userId, adminUserId))
                .limit(1);
            if (admin.length > 0) {
                await db_1.db.insert(admin_schema_1.adminAuditLog).values({
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
        }
        catch (error) {
            console.error('Error logging admin action:', error);
            // Don't throw - logging shouldn't break the main operation
        }
    }
    // Get admin audit log
    async getAuditLog(filters, limit = 100) {
        try {
            let query = db_1.db
                .select({
                log: admin_schema_1.adminAuditLog,
                admin: admin_schema_1.adminUsers
            })
                .from(admin_schema_1.adminAuditLog)
                .innerJoin(admin_schema_1.adminUsers, (0, drizzle_orm_1.eq)(admin_schema_1.adminAuditLog.adminUserId, admin_schema_1.adminUsers.id))
                .limit(limit);
            // Apply filters if provided
            // Note: Drizzle ORM where conditions would need to be built dynamically
            // For now, returning the basic query
            return await query;
        }
        catch (error) {
            console.error('Error fetching audit log:', error);
            return [];
        }
    }
    // Initialize default super admin (run once during setup)
    async initializeSuperAdmin(email, password) {
        try {
            // Check if any admin exists
            const existingAdmins = await db_1.db
                .select()
                .from(admin_schema_1.adminUsers)
                .limit(1);
            if (existingAdmins.length > 0) {
                console.log('Admin users already exist');
                return false;
            }
            // Create user first
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await db_1.db
                .insert(schema_1.user)
                .values({
                email,
                password: hashedPassword
            })
                .returning();
            if (newUser.length > 0) {
                // Create admin user
                await db_1.db.insert(admin_schema_1.adminUsers).values({
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
        }
        catch (error) {
            console.error('Error initializing super admin:', error);
            return false;
        }
    }
}
exports.AdminAuthService = AdminAuthService;
// Export singleton instance
exports.adminAuthService = new AdminAuthService();
