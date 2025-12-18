/**
 * Workers Controller
 *
 * REST API endpoints for monitoring and managing background workers.
 * Provides health checks and manual trigger endpoints.
 */

import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AppointmentReminderWorker } from './appointment-reminder.worker';
import { FinancialExportWorker } from './financial-export.worker';
import { StockReconciliationWorker } from './stock-reconciliation.worker';
import { RolesGuard, RequireRoles } from '../shared/auth/roles.guard';
import { Role } from '../shared/auth/permission.service';

@ApiTags('Workers')
@ApiBearerAuth('JWT-auth')
@Controller('workers')
@UseGuards(RolesGuard)
export class WorkersController {
  constructor(
    private readonly appointmentReminderWorker: AppointmentReminderWorker,
    private readonly financialExportWorker: FinancialExportWorker,
    private readonly stockReconciliationWorker: StockReconciliationWorker,
  ) {}

  /**
   * Get health status of all workers
   */
  @Get('health')
  @RequireRoles('Owner', 'Manager')
  @ApiOperation({
    summary: 'Get workers health status',
    description: 'Returns health status of all background workers',
  })
  @ApiResponse({ status: 200, description: 'Workers health status retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  getHealth() {
    return {
      workers: [
        this.appointmentReminderWorker.getHealth(),
        this.financialExportWorker.getHealth(),
        this.stockReconciliationWorker.getHealth(),
      ],
    };
  }

  /**
   * Manually trigger appointment reminder worker
   */
  @Post('appointment-reminder/trigger')
  @RequireRoles('Owner', 'Manager')
  @ApiOperation({
    summary: 'Trigger appointment reminder worker',
    description: 'Manually triggers the appointment reminder worker',
  })
  @ApiResponse({ status: 200, description: 'Appointment reminder worker triggered successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async triggerAppointmentReminder() {
    await this.appointmentReminderWorker['run']();
    return { message: 'Appointment reminder worker triggered' };
  }

  /**
   * Manually trigger financial export worker
   */
  @Post('financial-export/trigger')
  @RequireRoles('Owner', 'Accountant')
  @ApiOperation({
    summary: 'Trigger financial export worker',
    description: 'Manually triggers the financial export worker',
  })
  @ApiResponse({ status: 200, description: 'Financial export worker triggered successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async triggerFinancialExport() {
    await this.financialExportWorker['run']();
    return { message: 'Financial export worker triggered' };
  }

  /**
   * Process a specific financial export
   */
  @Post('financial-export/process/:exportId')
  @RequireRoles('Owner', 'Accountant')
  @ApiOperation({
    summary: 'Process financial export',
    description: 'Processes a specific financial export by ID',
  })
  @ApiParam({ name: 'exportId', description: 'Financial export UUID', type: String })
  @ApiResponse({ status: 200, description: 'Financial export processing started successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Financial export not found' })
  async processFinancialExport(@Param('exportId') exportId: string) {
    await this.financialExportWorker.processExport(exportId);
    return { message: `Financial export ${exportId} processing started` };
  }

  /**
   * Manually trigger stock reconciliation worker
   */
  @Post('stock-reconciliation/trigger')
  @RequireRoles('Owner', 'Manager')
  @ApiOperation({
    summary: 'Trigger stock reconciliation worker',
    description: 'Manually triggers the stock reconciliation worker',
  })
  @ApiResponse({ status: 200, description: 'Stock reconciliation worker triggered successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async triggerStockReconciliation() {
    await this.stockReconciliationWorker['run']();
    return { message: 'Stock reconciliation worker triggered' };
  }
}
