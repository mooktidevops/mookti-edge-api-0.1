import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AdminAuthService } from '../../src/services/admin-auth-service';
import { ADMIN_PERMISSIONS, ROLE_PERMISSIONS } from '../../src/lib/db/admin-schema';
import * as bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Mock the database
jest.mock('../../src/lib/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn()
  }
}));

describe('AdminAuthService', () => {
  let adminAuthService: AdminAuthService;
  let mockDb: any;
  
  beforeEach(() => {
    adminAuthService = new AdminAuthService();
    mockDb = require('../../src/lib/db').db;
    jest.clearAllMocks();
  });

  describe('checkAdminAccess', () => {
    it('should return isAdmin true for active admin user', async () => {
      const mockAdminUser = {
        id: 'admin_123',
        userId: 'user_456',
        role: 'admin',
        permissions: ['custom_permission'],
        isActive: true
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockAdminUser])
          })
        })
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(true)
        })
      });

      const result = await adminAuthService.checkAdminAccess('user_456');
      
      expect(result.isAdmin).toBe(true);
      expect(result.role).toBe('admin');
      expect(result.adminUser).toEqual(mockAdminUser);
      expect(result.permissions).toContain('custom_permission');
      expect(result.permissions).toContain(ADMIN_PERMISSIONS.VIEW_REVIEWS);
    });

    it('should return isAdmin false for non-admin user', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      const result = await adminAuthService.checkAdminAccess('user_456');
      
      expect(result.isAdmin).toBe(false);
      expect(result.adminUser).toBeUndefined();
      expect(result.permissions).toBeUndefined();
    });

    it('should return isAdmin false for inactive admin', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      const result = await adminAuthService.checkAdminAccess('user_456');
      
      expect(result.isAdmin).toBe(false);
    });

    it('should handle super_admin role with all permissions', async () => {
      const mockSuperAdmin = {
        id: 'admin_123',
        userId: 'user_456',
        role: 'super_admin',
        permissions: [],
        isActive: true
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSuperAdmin])
          })
        })
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(true)
        })
      });

      const result = await adminAuthService.checkAdminAccess('user_456');
      
      expect(result.isAdmin).toBe(true);
      expect(result.role).toBe('super_admin');
      expect(result.permissions).toEqual(expect.arrayContaining(Object.values(ADMIN_PERMISSIONS)));
    });

    it('should handle database errors gracefully', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await adminAuthService.checkAdminAccess('user_456');
      
      expect(result.isAdmin).toBe(false);
    });
  });

  describe('permission checks', () => {
    const permissions = [
      ADMIN_PERMISSIONS.VIEW_REVIEWS,
      ADMIN_PERMISSIONS.CREATE_REVIEWS,
      ADMIN_PERMISSIONS.VIEW_SESSIONS
    ];

    it('should check single permission correctly', () => {
      expect(adminAuthService.hasPermission(permissions, ADMIN_PERMISSIONS.VIEW_REVIEWS)).toBe(true);
      expect(adminAuthService.hasPermission(permissions, ADMIN_PERMISSIONS.DELETE_USERS)).toBe(false);
    });

    it('should check any permission correctly', () => {
      expect(adminAuthService.hasAnyPermission(permissions, [
        ADMIN_PERMISSIONS.DELETE_USERS,
        ADMIN_PERMISSIONS.VIEW_REVIEWS
      ])).toBe(true);
      
      expect(adminAuthService.hasAnyPermission(permissions, [
        ADMIN_PERMISSIONS.DELETE_USERS,
        ADMIN_PERMISSIONS.EDIT_SETTINGS
      ])).toBe(false);
    });

    it('should check all permissions correctly', () => {
      expect(adminAuthService.hasAllPermissions(permissions, [
        ADMIN_PERMISSIONS.VIEW_REVIEWS,
        ADMIN_PERMISSIONS.VIEW_SESSIONS
      ])).toBe(true);
      
      expect(adminAuthService.hasAllPermissions(permissions, [
        ADMIN_PERMISSIONS.VIEW_REVIEWS,
        ADMIN_PERMISSIONS.DELETE_USERS
      ])).toBe(false);
    });
  });

  describe('createAdminUser', () => {
    it('should create new admin user successfully', async () => {
      // Mock user exists check
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'user_456' }])
          })
        })
      });

      // Mock admin exists check
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      // Mock admin user lookup for logging
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'admin_creator' }])
          })
        })
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(true)
      });

      const result = await adminAuthService.createAdminUser(
        'user_456',
        'reviewer',
        'creator_123',
        ['custom_permission']
      );
      
      expect(result).toBe(true);
      expect(mockDb.insert).toHaveBeenCalledTimes(2); // Admin user + audit log
    });

    it('should fail if user does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      const result = await adminAuthService.createAdminUser(
        'user_456',
        'reviewer',
        'creator_123'
      );
      
      expect(result).toBe(false);
    });

    it('should fail if user is already admin', async () => {
      // User exists
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'user_456' }])
          })
        })
      });

      // Admin already exists
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'admin_456' }])
          })
        })
      });

      const result = await adminAuthService.createAdminUser(
        'user_456',
        'reviewer',
        'creator_123'
      );
      
      expect(result).toBe(false);
    });
  });

  describe('updateAdminUser', () => {
    it('should update admin user successfully', async () => {
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(true)
        })
      });

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'admin_123' }])
          })
        })
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(true)
      });

      const result = await adminAuthService.updateAdminUser(
        'admin_123',
        { role: 'admin', permissions: ['new_permission'] },
        'updater_123'
      );
      
      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      mockDb.update.mockImplementation(() => {
        throw new Error('Update failed');
      });

      const result = await adminAuthService.updateAdminUser(
        'admin_123',
        { role: 'admin' },
        'updater_123'
      );
      
      expect(result).toBe(false);
    });
  });

  describe('revokeAdminAccess', () => {
    it('should revoke admin access successfully', async () => {
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(true)
        })
      });

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'admin_123' }])
          })
        })
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(true)
      });

      const result = await adminAuthService.revokeAdminAccess('admin_123', 'revoker_123');
      
      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('initializeSuperAdmin', () => {
    it('should create super admin when none exists', async () => {
      // No existing admins
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([])
        })
      });

      // User creation
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'new_user_123' }])
        })
      });

      // Admin user creation
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockResolvedValue(true)
      });

      const result = await adminAuthService.initializeSuperAdmin('admin@test.com', 'password123');
      
      expect(result).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });

    it('should not create super admin if one exists', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([{ id: 'existing_admin' }])
        })
      });

      const result = await adminAuthService.initializeSuperAdmin('admin@test.com', 'password123');
      
      expect(result).toBe(false);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('logAdminAction', () => {
    it('should log admin action successfully', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'admin_123' }])
          })
        })
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(true)
      });

      await adminAuthService.logAdminAction(
        'user_123',
        'review_submitted',
        'session',
        'session_456',
        { score: 85 },
        '192.168.1.1',
        'Mozilla/5.0'
      );
      
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should not throw on logging errors', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(
        adminAuthService.logAdminAction('user_123', 'test_action')
      ).resolves.not.toThrow();
    });
  });

  describe('getAuditLog', () => {
    it('should fetch audit log successfully', async () => {
      const mockLogs = [
        { log: { action: 'review_submitted' }, admin: { role: 'reviewer' } }
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockLogs)
          })
        })
      });

      const logs = await adminAuthService.getAuditLog({}, 50);
      
      expect(logs).toEqual(mockLogs);
    });

    it('should return empty array on error', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database error');
      });

      const logs = await adminAuthService.getAuditLog();
      
      expect(logs).toEqual([]);
    });
  });
});