"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handler;
require("../../lib/polyfills");
const storage_service_1 = __importDefault(require("../../src/lib/db/storage-service"));
exports.config = {
    runtime: 'edge',
};
async function handler(request) {
    const url = new URL(request.url);
    const method = request.method;
    // Handle CORS
    if (method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }
    try {
        if (method === 'GET') {
            const documentId = url.searchParams.get('documentId');
            if (!documentId) {
                return new Response(JSON.stringify({ error: 'documentId required' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            const document = await storage_service_1.default.getDocumentById(documentId);
            if (!document) {
                return new Response(JSON.stringify({ error: 'Document not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            return new Response(JSON.stringify(document), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        if (method === 'POST') {
            const body = await request.json();
            const { userId, title, content, kind } = body;
            if (!userId || !title) {
                return new Response(JSON.stringify({ error: 'userId and title are required' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            const document = await storage_service_1.default.createDocument(userId, title, content || null, kind || 'text');
            return new Response(JSON.stringify(document), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        if (method === 'DELETE') {
            const documentId = url.searchParams.get('documentId');
            if (!documentId) {
                return new Response(JSON.stringify({ error: 'documentId required' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            const deleted = await storage_service_1.default.deleteDocument(documentId);
            return new Response(JSON.stringify({ success: deleted }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    catch (error) {
        console.error('Storage API error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
