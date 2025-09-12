import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

export interface JobData {
  id: string;
  type: 'growth-compass-update' | 'pattern-detection' | 'milestone-check' | 'review-trigger' | 'conversation-embed';
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  error?: string;
  retries: number;
  maxRetries: number;
}

export class JobQueue {
  private readonly queueKey = 'job-queue';
  private readonly processingKey = 'job-processing';
  private readonly maxRetries = 3;

  async enqueue(type: JobData['type'], payload: any): Promise<string> {
    const jobId = uuidv4();
    const job: JobData = {
      id: jobId,
      type,
      payload,
      status: 'pending',
      createdAt: new Date(),
      retries: 0,
      maxRetries: this.maxRetries
    };

    // Store job data
    await kv.set(`job:${jobId}`, job, { ex: 86400 }); // 24 hour TTL
    
    // Add to queue
    await kv.lpush(this.queueKey, jobId);
    
    console.log(`Job ${jobId} enqueued: ${type}`);
    return jobId;
  }

  async dequeue(): Promise<JobData | null> {
    // Move job from queue to processing
    const jobId = await kv.rpop(this.queueKey);
    if (!jobId) return null;
    
    // Add to processing list
    await kv.lpush(this.processingKey, jobId);

    const job = await kv.get<JobData>(`job:${jobId}`);
    if (!job) {
      // Remove from processing if job data not found
      await kv.lrem(this.processingKey, 0, jobId);
      return null;
    }

    // Update job status
    job.status = 'processing';
    job.processedAt = new Date();
    await kv.set(`job:${jobId}`, job, { ex: 86400 });

    return job;
  }

  async complete(jobId: string): Promise<void> {
    const job = await kv.get<JobData>(`job:${jobId}`);
    if (!job) return;

    job.status = 'completed';
    job.completedAt = new Date();
    await kv.set(`job:${jobId}`, job, { ex: 3600 }); // Keep completed jobs for 1 hour

    // Remove from processing list
    await kv.lrem(this.processingKey, 0, jobId);
    
    console.log(`Job ${jobId} completed`);
  }

  async fail(jobId: string, error: string): Promise<void> {
    const job = await kv.get<JobData>(`job:${jobId}`);
    if (!job) return;

    job.retries++;
    
    if (job.retries < job.maxRetries) {
      // Retry the job
      job.status = 'pending';
      job.error = error;
      await kv.set(`job:${jobId}`, job, { ex: 86400 });
      
      // Remove from processing and add back to queue
      await kv.lrem(this.processingKey, 0, jobId);
      await kv.lpush(this.queueKey, jobId);
      
      console.log(`Job ${jobId} failed, retrying (${job.retries}/${job.maxRetries}): ${error}`);
    } else {
      // Max retries reached
      job.status = 'failed';
      job.error = error;
      await kv.set(`job:${jobId}`, job, { ex: 86400 }); // Keep failed jobs for 24 hours
      
      // Remove from processing
      await kv.lrem(this.processingKey, 0, jobId);
      
      console.error(`Job ${jobId} failed permanently: ${error}`);
    }
  }

  async getJob(jobId: string): Promise<JobData | null> {
    return await kv.get<JobData>(`job:${jobId}`);
  }

  async getQueueLength(): Promise<number> {
    return await kv.llen(this.queueKey) || 0;
  }

  async getProcessingCount(): Promise<number> {
    return await kv.llen(this.processingKey) || 0;
  }

  async cleanup(): Promise<void> {
    // Move stuck processing jobs back to queue
    const processingJobIds = await kv.lrange<string>(this.processingKey, 0, -1);
    
    for (const jobId of processingJobIds) {
      const job = await kv.get<JobData>(`job:${jobId}`);
      if (!job) {
        await kv.lrem(this.processingKey, 0, jobId);
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

export const jobQueue = new JobQueue();
