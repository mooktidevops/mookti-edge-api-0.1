"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEV_USER = exports.DEV_USER_ID = void 0;
exports.getDevModeConfig = getDevModeConfig;
exports.isDevMode = isDevMode;
exports.getDevUser = getDevUser;
exports.logDev = logDev;
exports.logError = logError;
exports.DEV_USER_ID = '44567ef3-9b2d-44f2-a7a7-e191e6bf72aa';
exports.DEV_USER = {
    id: exports.DEV_USER_ID,
    email: 'dev@mookti.local',
    type: 'regular'
};
function getDevModeConfig(request) {
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
        userId: exports.DEV_USER_ID,
        userEmail: exports.DEV_USER.email
    };
}
function isDevMode(request) {
    return getDevModeConfig(request).enabled;
}
function getDevUser(request) {
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
    return exports.DEV_USER;
}
function logDev(message, data) {
    if (getDevModeConfig().verboseLogging) {
        console.log(`[DEV] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
}
function logError(context, error) {
    const config = getDevModeConfig();
    if (config.verboseLogging) {
        console.error(`[ERROR][${context}]`, {
            message: error?.message || 'Unknown error',
            stack: error?.stack,
            details: error
        });
    }
    else {
        console.error(`[ERROR][${context}]`, error?.message || error);
    }
}
