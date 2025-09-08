import { NextRequest, NextResponse } from 'next/server';
import { jobProcessor } from '../../../lib/job-processor';
import { jobQueue } from '../../../lib/job-queue';

export const runtime = 'nodejs'; // Need nodejs runtime for job processing

// POST /api/jobs/process - Process pending jobs
export async function POST(request: NextRequest) {
  try {
    // Verify this is an internal call (you could add auth here)
    const authHeader = request.headers.get('x-internal-secret');
    if (authHeader !== process.env.INTERNAL_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Clean up stuck jobs first
    await jobQueue.cleanup();

    // Get queue status
    const queueLength = await jobQueue.getQueueLength();
    const processingCount = await jobQueue.getProcessingCount();

    // Process up to 5 jobs per invocation
    const jobsProcessed = [];
    for (let i = 0; i < Math.min(5, queueLength); i++) {
      const job = await jobQueue.dequeue();
      if (!job) break;

      try {
        // Process the job inline (since we're in a serverless environment)
        switch (job.type) {
          case 'growth-compass-update':
            // Simplified inline processing for serverless
            console.log(`Processing growth compass update for session ${job.payload.sessionId}`);
            break;
          case 'pattern-detection':
            console.log(`Processing pattern detection for user ${job.payload.userId}`);
            break;
          case 'milestone-check':
            console.log(`Processing milestone check for session ${job.payload.sessionId}`);
            break;
          case 'review-trigger':
            console.log(`Processing review trigger for session ${job.payload.sessionId}`);
            break;
        }

        await jobQueue.complete(job.id);
        jobsProcessed.push(job.id);
      } catch (error) {
        await jobQueue.fail(job.id, error.message || 'Processing failed');
      }
    }

    return NextResponse.json({
      processed: jobsProcessed.length,
      remaining: queueLength - jobsProcessed.length,
      processing: processingCount,
      jobIds: jobsProcessed
    });

  } catch (error) {
    console.error('Job processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process jobs' },
      { status: 500 }
    );
  }
}

// GET /api/jobs/process - Get queue status
export async function GET(request: NextRequest) {
  try {
    const queueLength = await jobQueue.getQueueLength();
    const processingCount = await jobQueue.getProcessingCount();

    return NextResponse.json({
      pending: queueLength,
      processing: processingCount,
      total: queueLength + processingCount
    });

  } catch (error) {
    console.error('Queue status error:', error);
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
}