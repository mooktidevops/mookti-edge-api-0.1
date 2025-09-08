import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  uuid,
  boolean,
  text,
  index,
} from 'drizzle-orm/pg-core';
import { user } from './schema';

// Admin Users Table - extends regular users with admin privileges
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id).unique(),
  role: varchar('role', { length: 50 }).notNull().default('reviewer'), // 'super_admin', 'admin', 'reviewer', 'viewer'
  permissions: text('permissions').array().default([]), // Granular permissions
  isActive: boolean('is_active').notNull().default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: uuid('created_by').references(() => user.id),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    userIdx: index('idx_admin_users_user').on(table.userId),
    roleIdx: index('idx_admin_users_role').on(table.role),
    activeIdx: index('idx_admin_users_active').on(table.isActive),
  };
});

export type AdminUser = InferSelectModel<typeof adminUsers>;

// Admin Audit Log - track all admin actions
export const adminAuditLog = pgTable('admin_audit_log', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  adminUserId: uuid('admin_user_id').notNull().references(() => adminUsers.id),
  action: varchar('action', { length: 100 }).notNull(), // 'review_submitted', 'settings_changed', etc.
  resourceType: varchar('resource_type', { length: 50 }), // 'session', 'user', 'content', etc.
  resourceId: uuid('resource_id'),
  details: text('details'), // JSON string of action details
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    adminIdx: index('idx_audit_admin').on(table.adminUserId),
    actionIdx: index('idx_audit_action').on(table.action),
    createdIdx: index('idx_audit_created').on(table.createdAt),
  };
});

export type AdminAuditLogEntry = InferSelectModel<typeof adminAuditLog>;

// Admin permissions enum
export const ADMIN_PERMISSIONS = {
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
} as const;

// Role permission mappings
export const ROLE_PERMISSIONS = {
  super_admin: Object.values(ADMIN_PERMISSIONS), // All permissions
  admin: [
    ADMIN_PERMISSIONS.VIEW_REVIEWS,
    ADMIN_PERMISSIONS.CREATE_REVIEWS,
    ADMIN_PERMISSIONS.EDIT_REVIEWS,
    ADMIN_PERMISSIONS.VIEW_SESSIONS,
    ADMIN_PERMISSIONS.EXPORT_SESSIONS,
    ADMIN_PERMISSIONS.VIEW_CONTENT,
    ADMIN_PERMISSIONS.EDIT_CONTENT,
    ADMIN_PERMISSIONS.VIEW_USERS,
    ADMIN_PERMISSIONS.VIEW_SETTINGS,
    ADMIN_PERMISSIONS.VIEW_ANALYTICS,
    ADMIN_PERMISSIONS.EXPORT_ANALYTICS,
  ],
  reviewer: [
    ADMIN_PERMISSIONS.VIEW_REVIEWS,
    ADMIN_PERMISSIONS.CREATE_REVIEWS,
    ADMIN_PERMISSIONS.VIEW_SESSIONS,
    ADMIN_PERMISSIONS.VIEW_ANALYTICS,
  ],
  viewer: [
    ADMIN_PERMISSIONS.VIEW_REVIEWS,
    ADMIN_PERMISSIONS.VIEW_SESSIONS,
    ADMIN_PERMISSIONS.VIEW_ANALYTICS,
  ],
} as const;

export type AdminRole = keyof typeof ROLE_PERMISSIONS;
export type AdminPermission = typeof ADMIN_PERMISSIONS[keyof typeof ADMIN_PERMISSIONS];