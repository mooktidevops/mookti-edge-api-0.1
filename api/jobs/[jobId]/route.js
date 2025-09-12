"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const job_queue_1 = require("../../../lib/job-queue");
exports.runtime = 'edge';
// GET /api/jobs/[jobId] - Get job status
async function GET(request, { params }) {
    try {
        const jobId = params.jobId;
        if (!jobId) {
            return server_1.NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
        }
        const job = await job_queue_1.jobQueue.getJob(jobId);
        if (!job) {
            return server_1.NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({
            id: job.id,
            type: job.type,
            status: job.status,
            createdAt: job.createdAt,
            processedAt: job.processedAt,
            completedAt: job.completedAt,
            error: job.error,
            retries: job.retries
        });
    }
    catch (error) {
        console.error('Job status error:', error);
        return server_1.NextResponse.json({ error: 'Failed to get job status' }, { status: 500 });
    }
}
