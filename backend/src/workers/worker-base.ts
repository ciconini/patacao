/**
 * Worker Base Class
 *
 * Base class for all background workers.
 * Provides common functionality like error handling, logging, and lifecycle management.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Base class for background workers
 */
@Injectable()
export abstract class WorkerBase implements OnModuleInit, OnModuleDestroy {
  protected readonly logger: Logger;
  protected isRunning = false;
  protected workerName: string;

  constructor(workerName: string) {
    this.workerName = workerName;
    this.logger = new Logger(workerName);
  }

  /**
   * Called when the module is initialized
   */
  onModuleInit() {
    this.logger.log(`${this.workerName} initialized`);
  }

  /**
   * Called when the module is destroyed
   */
  onModuleDestroy() {
    this.logger.log(`${this.workerName} shutting down`);
    this.isRunning = false;
  }

  /**
   * Main worker execution method
   * Must be implemented by subclasses
   */
  protected abstract execute(): Promise<void>;

  /**
   * Executes the worker with error handling and logging
   */
  protected async run(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(`${this.workerName} is already running, skipping execution`);
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      this.logger.debug(`${this.workerName} started`);
      await this.execute();
      const duration = Date.now() - startTime;
      this.logger.log(`${this.workerName} completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `${this.workerName} failed after ${duration}ms: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't rethrow - allow worker to continue on next schedule
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Health check for the worker
   */
  getHealth(): { name: string; isRunning: boolean; lastRun?: Date } {
    return {
      name: this.workerName,
      isRunning: this.isRunning,
    };
  }
}
