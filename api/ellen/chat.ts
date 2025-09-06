import { NextRequest, NextResponse } from 'next/server';
import { EllenOrchestrator } from '../../src/services/ellen-orchestrator';
import type { EllenChatRequest } from '../../lib/types/api-types';

export const runtime = 'edge';

const orchestrator = new EllenOrchestrator();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as any;
    
    // Validate request
    if (!body.message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
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

    return NextResponse.json(response);
  } catch (error) {
    console.error('Ellen chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
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