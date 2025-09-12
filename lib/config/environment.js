"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvironmentConfig = getEnvironmentConfig;
exports.logEnvironment = logEnvironment;
function getEnvironment() {
    const env = process.env.NODE_ENV || process.env.VERCEL_ENV || 'development';
    switch (env) {
        case 'production':
        case 'prod':
            return 'production';
        case 'test':
        case 'testing':
            return 'test';
        default:
            return 'development';
    }
}
function getEnvironmentConfig() {
    const env = getEnvironment();
    const isDevelopment = env === 'development';
    const isTest = env === 'test';
    const isProduction = env === 'production';
    // Base configuration
    const baseConfig = {
        name: env,
        isDevelopment,
        isTest,
        isProduction,
        // API URLs
        edgeApiUrl: process.env.EDGE_API_URL || 'http://localhost:3005',
        webappUrl: process.env.WEBAPP_URL || 'http://localhost:3000',
        // Feature flags
        enableDevMode: false,
        enableVerboseLogging: false,
        skipAuthChecks: false,
        skipOwnershipChecks: false,
        // Database
        databaseUrl: process.env.DATABASE_URL || '',
        // AI Models
        defaultModel: 'tier-2',
        enableModelOptimization: true,
        // Vector Store
        pineconeIndex: process.env.PINECONE_INDEX_NAME || 'mookti-vectors',
        pineconeNamespace: 'production',
        // Redis/KV
        kvUrl: process.env.KV_URL || process.env.REDIS_URL || '',
    };
    // Environment-specific overrides
    if (isDevelopment) {
        return {
            ...baseConfig,
            enableDevMode: true,
            enableVerboseLogging: true,
            skipAuthChecks: process.env.DEV_AUTH_BYPASS === 'true',
            skipOwnershipChecks: process.env.DEV_AUTH_BYPASS === 'true',
            pineconeNamespace: 'development',
            devUserId: '44567ef3-9b2d-44f2-a7a7-e191e6bf72aa',
            devUserEmail: 'dev@mookti.local',
        };
    }
    if (isTest) {
        return {
            ...baseConfig,
            enableDevMode: true,
            enableVerboseLogging: true,
            skipAuthChecks: true,
            skipOwnershipChecks: true,
            pineconeNamespace: 'test',
            devUserId: 'test-user-id',
            devUserEmail: 'test@mookti.local',
            databaseUrl: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '',
        };
    }
    // Production configuration
    return {
        ...baseConfig,
        edgeApiUrl: process.env.EDGE_API_URL || 'https://api.mookti.ai',
        webappUrl: process.env.WEBAPP_URL || 'https://mookti.ai',
        pineconeNamespace: 'production',
        enableModelOptimization: true,
    };
}
function logEnvironment() {
    const config = getEnvironmentConfig();
    console.log('Environment Configuration:', {
        environment: config.name,
        isDevelopment: config.isDevelopment,
        isTest: config.isTest,
        isProduction: config.isProduction,
        devMode: config.enableDevMode,
        verboseLogging: config.enableVerboseLogging,
    });
}
