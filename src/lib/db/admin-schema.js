"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.ADMIN_PERMISSIONS = exports.adminAuditLog = exports.adminUsers = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("./schema");
// Admin Users Table - extends regular users with admin privileges
exports.adminUsers = (0, pg_core_1.pgTable)('admin_users', {
    id: (0, pg_core_1.uuid)('id').primaryKey().notNull().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => schema_1.user.id).unique(),
    role: (0, pg_core_1.varchar)('role', { length: 50 }).notNull().default('reviewer'), // 'super_admin', 'admin', 'reviewer', 'viewer'
    permissions: (0, pg_core_1.text)('permissions').array().default([]), // Granular permissions
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    lastLogin: (0, pg_core_1.timestamp)('last_login'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    createdBy: (0, pg_core_1.uuid)('created_by').references(() => schema_1.user.id),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (table) => {
    return {
        userIdx: (0, pg_core_1.index)('idx_admin_users_user').on(table.userId),
        roleIdx: (0, pg_core_1.index)('idx_admin_users_role').on(table.role),
        activeIdx: (0, pg_core_1.index)('idx_admin_users_active').on(table.isActive),
    };
});
// Admin Audit Log - track all admin actions
exports.adminAuditLog = (0, pg_core_1.pgTable)('admin_audit_log', {
    id: (0, pg_core_1.uuid)('id').primaryKey().notNull().defaultRandom(),
    adminUserId: (0, pg_core_1.uuid)('admin_user_id').notNull().references(() => exports.adminUsers.id),
    action: (0, pg_core_1.varchar)('action', { length: 100 }).notNull(), // 'review_submitted', 'settings_changed', etc.
    resourceType: (0, pg_core_1.varchar)('resource_type', { length: 50 }), // 'session', 'user', 'content', etc.
    resourceId: (0, pg_core_1.uuid)('resource_id'),
    details: (0, pg_core_1.text)('details'), // JSON string of action details
    ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 45 }),
    userAgent: (0, pg_core_1.text)('user_agent'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (table) => {
    return {
        adminIdx: (0, pg_core_1.index)('idx_audit_admin').on(table.adminUserId),
        actionIdx: (0, pg_core_1.index)('idx_audit_action').on(table.action),
        createdIdx: (0, pg_core_1.index)('idx_audit_created').on(table.createdAt),
    };
});
// Admin permissions enum
exports.ADMIN_PERMISSIONS = {
    // Review permissions
    VIEW_REVIEWS: 'view_reviews',
    CREATE_REVIEWS: 'create_reviews',
    EDIT_REVIEWS: 'edit_reviews',
    DELETE_REVIEWS: 'delete_reviews',
    // Session permissions
    VIEW_SESSIONS: 'view_sessions',
    EXPORT_SESSIONS: 'export_sessions',
    // Content permissions
    VIEW_CONTENT: 'view_content',
    EDIT_CONTENT: 'edit_content',
    CREATE_CONTENT: 'create_content',
    DELETE_CONTENT: 'delete_content',
    // User management
    VIEW_USERS: 'view_users',
    EDIT_USERS: 'edit_users',
    CREATE_ADMINS: 'create_admins',
    DELETE_USERS: 'delete_users',
    // Settings
    VIEW_SETTINGS: 'view_settings',
    EDIT_SETTINGS: 'edit_settings',
    // Analytics
    VIEW_ANALYTICS: 'view_analytics',
    EXPORT_ANALYTICS: 'export_analytics',
};
// Role permission mappings
exports.ROLE_PERMISSIONS = {
    super_admin: Object.values(exports.ADMIN_PERMISSIONS), // All permissions
    admin: [
        exports.ADMIN_PERMISSIONS.VIEW_REVIEWS,
        exports.ADMIN_PERMISSIONS.CREATE_REVIEWS,
        exports.ADMIN_PERMISSIONS.EDIT_REVIEWS,
        exports.ADMIN_PERMISSIONS.VIEW_SESSIONS,
        exports.ADMIN_PERMISSIONS.EXPORT_SESSIONS,
        exports.ADMIN_PERMISSIONS.VIEW_CONTENT,
        exports.ADMIN_PERMISSIONS.EDIT_CONTENT,
        exports.ADMIN_PERMISSIONS.VIEW_USERS,
        exports.ADMIN_PERMISSIONS.VIEW_SETTINGS,
        exports.ADMIN_PERMISSIONS.VIEW_ANALYTICS,
        exports.ADMIN_PERMISSIONS.EXPORT_ANALYTICS,
    ],
    reviewer: [
        exports.ADMIN_PERMISSIONS.VIEW_REVIEWS,
        exports.ADMIN_PERMISSIONS.CREATE_REVIEWS,
        exports.ADMIN_PERMISSIONS.VIEW_SESSIONS,
        exports.ADMIN_PERMISSIONS.VIEW_ANALYTICS,
    ],
    viewer: [
        exports.ADMIN_PERMISSIONS.VIEW_REVIEWS,
        exports.ADMIN_PERMISSIONS.VIEW_SESSIONS,
        exports.ADMIN_PERMISSIONS.VIEW_ANALYTICS,
    ],
};
