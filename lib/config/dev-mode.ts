import { AuthUser } from '../auth/middleware';

export const DEV_USER_ID = '44567ef3-9b2d-44f2-a7a7-e191e6bf72aa';

export const DEV_USER: AuthUser = {
  id: DEV_USER_ID,
  email: 'dev@mookti.local',
  type: 'regular' as const
};

export interface DevModeConfig {
  enabled: boolean;
  skipOwnershipChecks: boolean;
  verboseLogging: boolean;
  userId: string;
  userEmail: string;
}

export function getDevModeConfig(request?: Request): DevModeConfig {
  const isDevEnvironment = process.env.NODE_ENV === 'development' || 
                          process.env.DEV_AUTH_BYPASS === 'true' ||
                          process.env.VERCEL_ENV === 'development';
  
  const isDevHeader = request?.headers.get('X-Dev-Mode') === 'true' ||
                     request?.headers.get('X-Dev-User-Id') === 'dev-user';
  
  const enabled = isDevEnvironment || isDevHeader;
  
  return {
    enabled,
    skipOwnershipChecks: enabled,
    verboseLogging: enabled,
    userId: DEV_USER_ID,
    userEmail: DEV_USER.email
  };
}

export function isDevMode(request?: Request): boolean {
  return getDevModeConfig(request).enabled;
}

export function getDevUser(request?: Request): AuthUser | null {
  if (!isDevMode(request)) {
    return null;
  }
  
  const customUserId = request?.headers.get('X-Dev-User-Id');
  if (customUserId && customUserId !== 'dev-user') {
    return {
      id: customUserId,
      email: `${customUserId}@dev.local`,
      type: 'regular'
    };
  }
  
  return DEV_USER;
}

export function logDev(message: string, data?: any): void {
  if (getDevModeConfig().verboseLogging) {
    console.log(`[DEV] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

export function logError(context: string, error: any): void {
  const config = getDevModeConfig();
  if (config.verboseLogging) {
    console.error(`[ERROR][${context}]`, {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      details: error
    });
  } else {
    console.error(`[ERROR][${context}]`, error?.message || error);
  }
}