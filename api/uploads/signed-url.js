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
exports.config = void 0;
exports.default = handler;
const auth_native_1 = require("../../lib/auth-native");
const manager_1 = require("../../src/entitlements/manager");
exports.config = {
    runtime: 'edge',
};
async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }
    try {
        // Verify auth
        const authHeader = req.headers.get('Authorization');
        const authResult = await (0, auth_native_1.verifyFirebaseToken)(authHeader);
        if (!authResult.success) {
            return new Response(JSON.stringify(authResult.error), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        const userId = authResult.userId;
        // Parse request
        const body = await req.json();
        const { fileName, fileSize, fileType } = body;
        if (!fileName || !fileSize || !fileType) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        // Get entitlements
        const entitlements = await manager_1.EntitlementsManager.getInstance().getUserEntitlements(userId);
        // Check upload permissions
        if (!entitlements.plan.features.uploads_enabled) {
            return new Response(JSON.stringify({
                error: 'Uploads not available in your plan',
                upgrade_url: '/settings/billing'
            }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }
        // Check file size limit
        const maxSizeMB = entitlements.plan.features.upload_size_limit_mb;
        const fileSizeMB = fileSize / (1024 * 1024);
        if (fileSizeMB > maxSizeMB) {
            return new Response(JSON.stringify({
                error: `File size exceeds limit of ${maxSizeMB}MB`,
                file_size_mb: fileSizeMB,
                limit_mb: maxSizeMB
            }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        // Check daily upload limit
        const dailyLimit = entitlements.plan.features.daily_upload_limit;
        const uploadsToday = entitlements.usage.uploads_today;
        if (uploadsToday >= dailyLimit) {
            return new Response(JSON.stringify({
                error: `Daily upload limit reached (${dailyLimit} files)`,
                resets_at: new Date(Date.now() + 86400000).toISOString()
            }), { status: 429, headers: { 'Content-Type': 'application/json' } });
        }
        // Generate secure upload URL and document ID using Web Crypto API
        const randomBytes = new Uint8Array(8);
        crypto.getRandomValues(randomBytes);
        const docIdSuffix = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('');
        const docId = `doc_${userId}_${Date.now()}_${docIdSuffix}`;
        const tokenBytes = new Uint8Array(32);
        crypto.getRandomValues(tokenBytes);
        const uploadToken = Array.from(tokenBytes, b => b.toString(16).padStart(2, '0')).join('');
        // Store upload token in KV (expires in 1 hour)
        const kv = await Promise.resolve().then(() => __importStar(require('@vercel/kv'))).then(m => m.kv);
        await kv.set(`upload_token_${uploadToken}`, {
            userId,
            docId,
            fileName,
            fileSize,
            fileType,
            expiresAt: Date.now() + 3600000, // 1 hour
        }, { ex: 3600 } // Redis expiry
        );
        // Generate signed URL for direct upload
        // In production, this will use the Vercel deployment URL automatically
        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        const uploadUrl = `${baseUrl}/api/uploads/ingest?token=${uploadToken}`;
        return new Response(JSON.stringify({
            uploadUrl,
            docId,
            expiresIn: 3600,
            limits: {
                max_size_mb: maxSizeMB,
                daily_uploads_remaining: dailyLimit - uploadsToday - 1,
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    catch (error) {
        console.error('Signed URL generation error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to generate upload URL',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
