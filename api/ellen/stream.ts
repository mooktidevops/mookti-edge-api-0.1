import { NextRequest, NextResponse } from 'next/server';
import { EllenOrchestrator } from '../../src/services/ellen-orchestrator';
import type { EllenStreamRequest } from '../../lib/types/api-types';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as EllenStreamRequest;
    
    if (!body.message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Create a TransformStream for streaming response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Process in background
    (async () => {
      try {
        const orchestrator = new EllenOrchestrator();
        
        // Send initial thinking message
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ 
            type: 'status', 
            message: 'Thinking...' 
          })}\n\n`)
        );

        // Process request
        const response = await orchestrator.processRequest({
          message: body.message,
          context: body.context || {}
        });

        // Stream the response in chunks
        const chunks = response.response.split('\n\n');
        for (const chunk of chunks) {
          await writer.write(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'content', 
              content: chunk 
            })}\n\n`)
          );
          // Small delay between chunks for streaming effect
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Send metadata
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ 
            type: 'metadata',
            toolsUsed: response.toolsUsed,
            citations: response.citations,
            suggestedFollowUp: response.suggestedFollowUp,
            growthMetrics: response.growthMetrics
          })}\n\n`)
        );

        // Send completion signal
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ 
            type: 'done' 
          })}\n\n`)
        );
      } catch (error) {
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            message: 'Failed to process request' 
          })}\n\n`)
        );
      } finally {
        await writer.close();
      }
    })();

    return new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Ellen stream error:', error);
    return NextResponse.json(
      { error: 'Failed to start stream' },
      { status: 500 }
    );
  }
}