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
require("../../lib/edge-polyfills");
const auth_native_1 = require("../../lib/auth-native");
const pinecone_1 = require("@pinecone-database/pinecone");
exports.config = {
    runtime: 'edge',
};
const pinecone = new pinecone_1.Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});
async function handler(req) {
    if (req.method !== 'DELETE') {
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
        const { docId } = body;
        if (!docId) {
            return new Response(JSON.stringify({ error: 'Missing document ID' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        // Verify document ownership
        const kv = await Promise.resolve().then(() => __importStar(require('@vercel/kv'))).then(m => m.kv);
        const docMetadata = await kv.get(`doc_${docId}`);
        if (!docMetadata) {
            return new Response(JSON.stringify({ error: 'Document not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
        const doc = docMetadata;
        if (doc.userId !== userId) {
            return new Response(JSON.stringify({ error: 'Unauthorized to delete this document' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }
        // Delete from Pinecone
        const index = pinecone.index(process.env.PINECONE_INDEX_NAME || 'mookti-vectors');
        const namespace = `u_${userId}`;
        // Delete all chunks for this document
        const chunkIds = [];
        for (let i = 0; i < doc.chunks; i++) {
            chunkIds.push(`${docId}_chunk_${i}`);
        }
        if (chunkIds.length > 0) {
            await index.namespace(namespace).deleteMany(chunkIds);
        }
        // Delete document metadata
        await kv.del(`doc_${docId}`);
        // Audit log
        console.log(`Document ${docId} deleted by user ${userId} at ${new Date().toISOString()}`);
        // Store deletion record for compliance
        await kv.set(`deletion_${docId}`, {
            docId,
            userId,
            fileName: doc.fileName,
            deletedAt: new Date().toISOString(),
            reason: 'user_requested',
        }, { ex: 2592000 } // Keep for 30 days
        );
        return new Response(JSON.stringify({
            success: true,
            message: 'Document successfully deleted',
            docId,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    catch (error) {
        console.error('Document deletion error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to delete document',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
