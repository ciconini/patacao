/**
 * Queue Controller
 *
 * REST API endpoints for monitoring and managing queues.
 * Provides queue statistics and job management.
 */

import { Controller, Get, Post, Param, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { RolesGuard, RequireRoles } from '../../shared/auth/roles.guard';
import { DOMAIN_EVENTS_QUEUE } from './bull-event-bus';

@ApiTags('Queues')
@ApiBearerAuth('JWT-auth')
@Controller('queues')
@UseGuards(RolesGuard)
export class QueueController {
  constructor(
    @InjectQueue(DOMAIN_EVENTS_QUEUE)
    private readonly eventQueue: Queue,
  ) {}

  /**
   * Get queue statistics
   */
  @Get('stats')
  @RequireRoles('Owner', 'Manager')
  @ApiOperation({
    summary: 'Get queue statistics',
    description: 'Returns statistics for the domain events queue',
  })
  @ApiResponse({ status: 200, description: 'Queue statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.eventQueue.getWaitingCount(),
      this.eventQueue.getActiveCount(),
      this.eventQueue.getCompletedCount(),
      this.eventQueue.getFailedCount(),
    ]);

    return {
      queue: DOMAIN_EVENTS_QUEUE,
      stats: {
        waiting,
        active,
        completed,
        failed,
      },
    };
  }

  /**
   * Get failed jobs
   */
  @Get('failed')
  @RequireRoles('Owner', 'Manager')
  @ApiOperation({
    summary: 'Get failed jobs',
    description: 'Returns list of failed jobs from the queue',
  })
  @ApiResponse({ status: 200, description: 'Failed jobs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getFailedJobs() {
    const jobs = await this.eventQueue.getFailed();
    return {
      queue: DOMAIN_EVENTS_QUEUE,
      failed: jobs.map((job) => ({
        id: job.id,
        data: job.data,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
      })),
    };
  }

  /**
   * Retry a failed job
   */
  @Post('failed/:jobId/retry')
  @RequireRoles('Owner', 'Manager')
  @ApiOperation({ summary: 'Retry failed job', description: 'Retries a specific failed job by ID' })
  @ApiParam({ name: 'jobId', description: 'Job ID', type: String })
  @ApiResponse({ status: 200, description: 'Job queued for retry successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async retryFailedJob(@Param('jobId') jobId: string) {
    const job = await this.eventQueue.getJob(jobId);
    if (!job) {
      return { error: 'Job not found' };
    }

    await job.retry();
    return { message: `Job ${jobId} queued for retry` };
  }

  /**
   * Remove a failed job
   */
  @Delete('failed/:jobId')
  @RequireRoles('Owner', 'Manager')
  @ApiOperation({
    summary: 'Remove failed job',
    description: 'Removes a specific failed job by ID',
  })
  @ApiParam({ name: 'jobId', description: 'Job ID', type: String })
  @ApiResponse({ status: 200, description: 'Job removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async removeFailedJob(@Param('jobId') jobId: string) {
    const job = await this.eventQueue.getJob(jobId);
    if (!job) {
      return { error: 'Job not found' };
    }

    await job.remove();
    return { message: `Job ${jobId} removed` };
  }

  /**
   * Clean completed jobs
   */
  @Post('clean')
  @RequireRoles('Owner', 'Manager')
  @ApiOperation({
    summary: 'Clean completed jobs',
    description: 'Removes completed jobs older than 24 hours',
  })
  @ApiResponse({ status: 200, description: 'Completed jobs cleaned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async cleanCompletedJobs() {
    await this.eventQueue.clean(24 * 3600 * 1000, 'completed', 1000); // 24 hours, 1000 jobs
    return { message: 'Completed jobs cleaned' };
  }
}
