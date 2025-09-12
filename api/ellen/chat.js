"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const ellen_orchestrator_1 = require("../../src/services/ellen-orchestrator");
exports.runtime = 'edge';
const orchestrator = new ellen_orchestrator_1.EllenOrchestrator();
async function POST(request) {
    try {
        const body = await request.json();
        // Validate request
        if (!body.message) {
            return server_1.NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }
        // Process request through orchestrator
        const response = await orchestrator.processRequest({
            message: body.message,
            context: {
                ...body.context,
                sessionId: body.sessionId,
                sessionType: body.sessionType,
                sessionGoal: body.sessionGoal
            },
            queryType: body.queryType,
            toolOverride: body.toolOverride
        });
        return server_1.NextResponse.json(response);
    }
    catch (error) {
        console.error('Ellen chat error:', error);
        return server_1.NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
async function GET(request) {
    return server_1.NextResponse.json({
        service: 'Ellen Chat API',
        version: '1.0.0',
        status: 'operational',
        endpoints: {
            chat: {
                method: 'POST',
                path: '/api/ellen/chat',
                body: {
                    message: 'string (required)',
                    context: {
                        userId: 'string (optional)',
                        sessionId: 'string (optional)',
                        priorTurns: 'array (optional)',
                        activeTask: 'string (optional)',
                        learningGoal: 'string (optional)'
                    },
                    intent: 'string (optional)',
                    toolOverride: 'string (optional)'
                }
            }
        }
    });
}
