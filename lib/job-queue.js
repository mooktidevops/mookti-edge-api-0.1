"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobQueue = exports.JobQueue = void 0;
const kv_1 = require("@vercel/kv");
const uuid_1 = require("uuid");
class JobQueue {
    queueKey = 'job-queue';
    processingKey = 'job-processing';
    maxRetries = 3;
    async enqueue(type, payload) {
        const jobId = (0, uuid_1.v4)();
        const job = {
            id: jobId,
            type,
            payload,
            status: 'pending',
            createdAt: new Date(),
            retries: 0,
            maxRetries: this.maxRetries
        };
        // Store job data
        await kv_1.kv.set(`job:${jobId}`, job, { ex: 86400 }); // 24 hour TTL
        // Add to queue
        await kv_1.kv.lpush(this.queueKey, jobId);
        console.log(`Job ${jobId} enqueued: ${type}`);
        return jobId;
    }
    async dequeue() {
        // Move job from queue to processing
        const jobId = await kv_1.kv.rpop(this.queueKey);
        if (!jobId)
            return null;
        // Add to processing list
        await kv_1.kv.lpush(this.processingKey, jobId);
        const job = await kv_1.kv.get(`job:${jobId}`);
        if (!job) {
            // Remove from processing if job data not found
            await kv_1.kv.lrem(this.processingKey, 0, jobId);
            return null;
        }
        // Update job status
        job.status = 'processing';
        job.processedAt = new Date();
        await kv_1.kv.set(`job:${jobId}`, job, { ex: 86400 });
        return job;
    }
    async complete(jobId) {
        const job = await kv_1.kv.get(`job:${jobId}`);
        if (!job)
            return;
        job.status = 'completed';
        job.completedAt = new Date();
        await kv_1.kv.set(`job:${jobId}`, job, { ex: 3600 }); // Keep completed jobs for 1 hour
        // Remove from processing list
        await kv_1.kv.lrem(this.processingKey, 0, jobId);
        console.log(`Job ${jobId} completed`);
    }
    async fail(jobId, error) {
        const job = await kv_1.kv.get(`job:${jobId}`);
        if (!job)
            return;
        job.retries++;
        if (job.retries < job.maxRetries) {
            // Retry the job
            job.status = 'pending';
            job.error = error;
            await kv_1.kv.set(`job:${jobId}`, job, { ex: 86400 });
            // Remove from processing and add back to queue
            await kv_1.kv.lrem(this.processingKey, 0, jobId);
            await kv_1.kv.lpush(this.queueKey, jobId);
            console.log(`Job ${jobId} failed, retrying (${job.retries}/${job.maxRetries}): ${error}`);
        }
        else {
            // Max retries reached
            job.status = 'failed';
            job.error = error;
            await kv_1.kv.set(`job:${jobId}`, job, { ex: 86400 }); // Keep failed jobs for 24 hours
            // Remove from processing
            await kv_1.kv.lrem(this.processingKey, 0, jobId);
            console.error(`Job ${jobId} failed permanently: ${error}`);
        }
    }
    async getJob(jobId) {
        return await kv_1.kv.get(`job:${jobId}`);
    }
    async getQueueLength() {
        return await kv_1.kv.llen(this.queueKey) || 0;
    }
    async getProcessingCount() {
        return await kv_1.kv.llen(this.processingKey) || 0;
    }
    async cleanup() {
        // Move stuck processing jobs back to queue
        const processingJobIds = await kv_1.kv.lrange(this.processingKey, 0, -1);
        for (const jobId of processingJobIds) {
            const job = await kv_1.kv.get(`job:${jobId}`);
            if (!job) {
                await kv_1.kv.lrem(this.processingKey, 0, jobId);
                continue;
            }
            // Check if job has been processing for more than 5 minutes
            if (job.processedAt &&
                new Date().getTime() - new Date(job.processedAt).getTime() > 300000) {
                await this.fail(jobId, 'Processing timeout');
            }
        }
    }
}
exports.JobQueue = JobQueue;
exports.jobQueue = new JobQueue();
