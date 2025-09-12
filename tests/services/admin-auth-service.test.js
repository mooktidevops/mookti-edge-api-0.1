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
const globals_1 = require("@jest/globals");
const admin_auth_service_1 = require("../../src/services/admin-auth-service");
const admin_schema_1 = require("../../src/lib/db/admin-schema");
const bcrypt = __importStar(require("bcryptjs"));
// Mock bcrypt
globals_1.jest.mock('bcryptjs', () => ({
    hash: globals_1.jest.fn().mockResolvedValue('hashed_password'),
    compare: globals_1.jest.fn().mockResolvedValue(true)
}));
// Mock the database
globals_1.jest.mock('../../src/lib/db', () => ({
    db: {
        select: globals_1.jest.fn(),
        insert: globals_1.jest.fn(),
        update: globals_1.jest.fn()
    }
}));
(0, globals_1.describe)('AdminAuthService', () => {
    let adminAuthService;
    let mockDb;
    (0, globals_1.beforeEach)(() => {
        adminAuthService = new admin_auth_service_1.AdminAuthService();
        mockDb = require('../../src/lib/db').db;
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('checkAdminAccess', () => {
        (0, globals_1.it)('should return isAdmin true for active admin user', async () => {
            const mockAdminUser = {
                id: 'admin_123',
                userId: 'user_456',
                role: 'admin',
                permissions: ['custom_permission'],
                isActive: true
            };
            mockDb.select.mockReturnValue({
                from: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockReturnValue({
                        limit: globals_1.jest.fn().mockResolvedValue([mockAdminUser])
                    })
                })
            });
            mockDb.update.mockReturnValue({
                set: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockResolvedValue(true)
                })
            });
            const result = await adminAuthService.checkAdminAccess('user_456');
            (0, globals_1.expect)(result.isAdmin).toBe(true);
            (0, globals_1.expect)(result.role).toBe('admin');
            (0, globals_1.expect)(result.adminUser).toEqual(mockAdminUser);
            (0, globals_1.expect)(result.permissions).toContain('custom_permission');
            (0, globals_1.expect)(result.permissions).toContain(admin_schema_1.ADMIN_PERMISSIONS.VIEW_REVIEWS);
        });
        (0, globals_1.it)('should return isAdmin false for non-admin user', async () => {
            mockDb.select.mockReturnValue({
                from: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockReturnValue({
                        limit: globals_1.jest.fn().mockResolvedValue([])
                    })
                })
            });
            const result = await adminAuthService.checkAdminAccess('user_456');
            (0, globals_1.expect)(result.isAdmin).toBe(false);
            (0, globals_1.expect)(result.adminUser).toBeUndefined();
            (0, globals_1.expect)(result.permissions).toBeUndefined();
        });
        (0, globals_1.it)('should return isAdmin false for inactive admin', async () => {
            mockDb.select.mockReturnValue({
                from: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockReturnValue({
                        limit: globals_1.jest.fn().mockResolvedValue([])
                    })
                })
            });
            const result = await adminAuthService.checkAdminAccess('user_456');
            (0, globals_1.expect)(result.isAdmin).toBe(false);
        });
        (0, globals_1.it)('should handle super_admin role with all permissions', async () => {
            const mockSuperAdmin = {
                id: 'admin_123',
                userId: 'user_456',
                role: 'super_admin',
                permissions: [],
                isActive: true
            };
            mockDb.select.mockReturnValue({
                from: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockReturnValue({
                        limit: globals_1.jest.fn().mockResolvedValue([mockSuperAdmin])
                    })
                })
            });
            mockDb.update.mockReturnValue({
                set: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockResolvedValue(true)
                })
            });
            const result = await adminAuthService.checkAdminAccess('user_456');
            (0, globals_1.expect)(result.isAdmin).toBe(true);
            (0, globals_1.expect)(result.role).toBe('super_admin');
            (0, globals_1.expect)(result.permissions).toEqual(globals_1.expect.arrayContaining(Object.values(admin_schema_1.ADMIN_PERMISSIONS)));
        });
        (0, globals_1.it)('should handle database errors gracefully', async () => {
            mockDb.select.mockImplementation(() => {
                throw new Error('Database error');
            });
            const result = await adminAuthService.checkAdminAccess('user_456');
            (0, globals_1.expect)(result.isAdmin).toBe(false);
        });
    });
    (0, globals_1.describe)('permission checks', () => {
        const permissions = [
            admin_schema_1.ADMIN_PERMISSIONS.VIEW_REVIEWS,
            admin_schema_1.ADMIN_PERMISSIONS.CREATE_REVIEWS,
            admin_schema_1.ADMIN_PERMISSIONS.VIEW_SESSIONS
        ];
        (0, globals_1.it)('should check single permission correctly', () => {
            (0, globals_1.expect)(adminAuthService.hasPermission(permissions, admin_schema_1.ADMIN_PERMISSIONS.VIEW_REVIEWS)).toBe(true);
            (0, globals_1.expect)(adminAuthService.hasPermission(permissions, admin_schema_1.ADMIN_PERMISSIONS.DELETE_USERS)).toBe(false);
        });
        (0, globals_1.it)('should check any permission correctly', () => {
            (0, globals_1.expect)(adminAuthService.hasAnyPermission(permissions, [
                admin_schema_1.ADMIN_PERMISSIONS.DELETE_USERS,
                admin_schema_1.ADMIN_PERMISSIONS.VIEW_REVIEWS
            ])).toBe(true);
            (0, globals_1.expect)(adminAuthService.hasAnyPermission(permissions, [
                admin_schema_1.ADMIN_PERMISSIONS.DELETE_USERS,
                admin_schema_1.ADMIN_PERMISSIONS.EDIT_SETTINGS
            ])).toBe(false);
        });
        (0, globals_1.it)('should check all permissions correctly', () => {
            (0, globals_1.expect)(adminAuthService.hasAllPermissions(permissions, [
                admin_schema_1.ADMIN_PERMISSIONS.VIEW_REVIEWS,
                admin_schema_1.ADMIN_PERMISSIONS.VIEW_SESSIONS
            ])).toBe(true);
            (0, globals_1.expect)(adminAuthService.hasAllPermissions(permissions, [
                admin_schema_1.ADMIN_PERMISSIONS.VIEW_REVIEWS,
                admin_schema_1.ADMIN_PERMISSIONS.DELETE_USERS
            ])).toBe(false);
        });
    });
    (0, globals_1.describe)('createAdminUser', () => {
        (0, globals_1.it)('should create new admin user successfully', async () => {
            // Mock user exists check
            mockDb.select.mockReturnValueOnce({
                from: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockReturnValue({
                        limit: globals_1.jest.fn().mockResolvedValue([{ id: 'user_456' }])
                    })
                })
            });
            // Mock admin exists check
            mockDb.select.mockReturnValueOnce({
                from: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockReturnValue({
                        limit: globals_1.jest.fn().mockResolvedValue([])
                    })
                })
            });
            // Mock admin user lookup for logging
            mockDb.select.mockReturnValueOnce({
                from: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockReturnValue({
                        limit: globals_1.jest.fn().mockResolvedValue([{ id: 'admin_creator' }])
                    })
                })
            });
            mockDb.insert.mockReturnValue({
                values: globals_1.jest.fn().mockResolvedValue(true)
            });
            const result = await adminAuthService.createAdminUser('user_456', 'reviewer', 'creator_123', ['custom_permission']);
            (0, globals_1.expect)(result).toBe(true);
            (0, globals_1.expect)(mockDb.insert).toHaveBeenCalledTimes(2); // Admin user + audit log
        });
        (0, globals_1.it)('should fail if user does not exist', async () => {
            mockDb.select.mockReturnValue({
                from: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockReturnValue({
                        limit: globals_1.jest.fn().mockResolvedValue([])
                    })
                })
            });
            const result = await adminAuthService.createAdminUser('user_456', 'reviewer', 'creator_123');
            (0, globals_1.expect)(result).toBe(false);
        });
        (0, globals_1.it)('should fail if user is already admin', async () => {
            // User exists
            mockDb.select.mockReturnValueOnce({
                from: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockReturnValue({
                        limit: globals_1.jest.fn().mockResolvedValue([{ id: 'user_456' }])
                    })
                })
            });
            // Admin already exists
            mockDb.select.mockReturnValueOnce({
                from: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockReturnValue({
                        limit: globals_1.jest.fn().mockResolvedValue([{ id: 'admin_456' }])
                    })
                })
            });
            const result = await adminAuthService.createAdminUser('user_456', 'reviewer', 'creator_123');
            (0, globals_1.expect)(result).toBe(false);
        });
    });
    (0, globals_1.describe)('updateAdminUser', () => {
        (0, globals_1.it)('should update admin user successfully', async () => {
            mockDb.update.mockReturnValue({
                set: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockResolvedValue(true)
                })
            });
            mockDb.select.mockReturnValue({
                from: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockReturnValue({
                        limit: globals_1.jest.fn().mockResolvedValue([{ id: 'admin_123' }])
                    })
                })
            });
            mockDb.insert.mockReturnValue({
                values: globals_1.jest.fn().mockResolvedValue(true)
            });
            const result = await adminAuthService.updateAdminUser('admin_123', { role: 'admin', permissions: ['new_permission'] }, 'updater_123');
            (0, globals_1.expect)(result).toBe(true);
            (0, globals_1.expect)(mockDb.update).toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle update errors', async () => {
            mockDb.update.mockImplementation(() => {
                throw new Error('Update failed');
            });
            const result = await adminAuthService.updateAdminUser('admin_123', { role: 'admin' }, 'updater_123');
            (0, globals_1.expect)(result).toBe(false);
        });
    });
    (0, globals_1.describe)('revokeAdminAccess', () => {
        (0, globals_1.it)('should revoke admin access successfully', async () => {
            mockDb.update.mockReturnValue({
                set: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockResolvedValue(true)
                })
            });
            mockDb.select.mockReturnValue({
                from: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockReturnValue({
                        limit: globals_1.jest.fn().mockResolvedValue([{ id: 'admin_123' }])
                    })
                })
            });
            mockDb.insert.mockReturnValue({
                values: globals_1.jest.fn().mockResolvedValue(true)
            });
            const result = await adminAuthService.revokeAdminAccess('admin_123', 'revoker_123');
            (0, globals_1.expect)(result).toBe(true);
            (0, globals_1.expect)(mockDb.update).toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('initializeSuperAdmin', () => {
        (0, globals_1.it)('should create super admin when none exists', async () => {
            // No existing admins
            mockDb.select.mockReturnValueOnce({
                from: globals_1.jest.fn().mockReturnValue({
                    limit: globals_1.jest.fn().mockResolvedValue([])
                })
            });
            // User creation
            mockDb.insert.mockReturnValueOnce({
                values: globals_1.jest.fn().mockReturnValue({
                    returning: globals_1.jest.fn().mockResolvedValue([{ id: 'new_user_123' }])
                })
            });
            // Admin user creation
            mockDb.insert.mockReturnValueOnce({
                values: globals_1.jest.fn().mockResolvedValue(true)
            });
            const result = await adminAuthService.initializeSuperAdmin('admin@test.com', 'password123');
            (0, globals_1.expect)(result).toBe(true);
            (0, globals_1.expect)(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
            (0, globals_1.expect)(mockDb.insert).toHaveBeenCalledTimes(2);
        });
        (0, globals_1.it)('should not create super admin if one exists', async () => {
            mockDb.select.mockReturnValue({
                from: globals_1.jest.fn().mockReturnValue({
                    limit: globals_1.jest.fn().mockResolvedValue([{ id: 'existing_admin' }])
                })
            });
            const result = await adminAuthService.initializeSuperAdmin('admin@test.com', 'password123');
            (0, globals_1.expect)(result).toBe(false);
            (0, globals_1.expect)(mockDb.insert).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('logAdminAction', () => {
        (0, globals_1.it)('should log admin action successfully', async () => {
            mockDb.select.mockReturnValue({
                from: globals_1.jest.fn().mockReturnValue({
                    where: globals_1.jest.fn().mockReturnValue({
                        limit: globals_1.jest.fn().mockResolvedValue([{ id: 'admin_123' }])
                    })
                })
            });
            mockDb.insert.mockReturnValue({
                values: globals_1.jest.fn().mockResolvedValue(true)
            });
            await adminAuthService.logAdminAction('user_123', 'review_submitted', 'session', 'session_456', { score: 85 }, '192.168.1.1', 'Mozilla/5.0');
            (0, globals_1.expect)(mockDb.insert).toHaveBeenCalled();
        });
        (0, globals_1.it)('should not throw on logging errors', async () => {
            mockDb.select.mockImplementation(() => {
                throw new Error('Database error');
            });
            await (0, globals_1.expect)(adminAuthService.logAdminAction('user_123', 'test_action')).resolves.not.toThrow();
        });
    });
    (0, globals_1.describe)('getAuditLog', () => {
        (0, globals_1.it)('should fetch audit log successfully', async () => {
            const mockLogs = [
                { log: { action: 'review_submitted' }, admin: { role: 'reviewer' } }
            ];
            mockDb.select.mockReturnValue({
                from: globals_1.jest.fn().mockReturnValue({
                    innerJoin: globals_1.jest.fn().mockReturnValue({
                        limit: globals_1.jest.fn().mockResolvedValue(mockLogs)
                    })
                })
            });
            const logs = await adminAuthService.getAuditLog({}, 50);
            (0, globals_1.expect)(logs).toEqual(mockLogs);
        });
        (0, globals_1.it)('should return empty array on error', async () => {
            mockDb.select.mockImplementation(() => {
                throw new Error('Database error');
            });
            const logs = await adminAuthService.getAuditLog();
            (0, globals_1.expect)(logs).toEqual([]);
        });
    });
});
