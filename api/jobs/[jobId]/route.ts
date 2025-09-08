import { NextRequest, NextResponse } from 'next/server';
import { jobQueue } from '../../../lib/job-queue';

export const runtime = 'edge';

// GET /api/jobs/[jobId] - Get job status
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const job = await jobQueue.getJob(jobId);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: job.id,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt,
      processedAt: job.processedAt,
      completedAt: job.completedAt,
      error: job.error,
      retries: job.retries
    });
    
  } catch (error) {
    console.error('Job status error:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}