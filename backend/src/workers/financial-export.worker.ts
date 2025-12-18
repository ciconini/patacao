/**
 * Financial Export Worker
 *
 * Background worker that processes financial export requests.
 * Handles large exports that may take time to generate.
 *
 * Features:
 * - Processes pending financial exports
 * - Generates CSV/JSON files
 * - Uploads to SFTP (when configured)
 * - Updates export status
 */

import { Injectable, Inject } from '@nestjs/common';
import { WorkerBase } from './worker-base';
import { FinancialExportRepository } from '../modules/financial/ports/financial-export.repository.port';
import { InvoiceRepository } from '../modules/financial/ports/invoice.repository.port';
import { TransactionRepository } from '../modules/financial/ports/transaction.repository.port';
import { CreditNoteRepository } from '../modules/financial/ports/credit-note.repository.port';
import { Logger } from '../shared/logger/logger.service';
import { FinancialExport } from '../modules/financial/domain/financial-export.entity';
import { ExportFormat } from '../modules/financial/domain/financial-export.entity';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Financial export worker
 * Processes pending financial exports in the background
 */
@Injectable()
export class FinancialExportWorker extends WorkerBase {
  private readonly exportDir: string;

  constructor(
    @Inject('FinancialExportRepository')
    private readonly financialExportRepository: FinancialExportRepository,
    @Inject('InvoiceRepository')
    private readonly invoiceRepository: InvoiceRepository,
    @Inject('TransactionRepository')
    private readonly transactionRepository: TransactionRepository,
    @Inject('CreditNoteRepository')
    private readonly creditNoteRepository: CreditNoteRepository,
    @Inject('Logger')
    private readonly appLogger: Logger,
  ) {
    super('FinancialExportWorker');
    // TODO: Get from config service
    this.exportDir = path.join(process.cwd(), 'exports', 'financial');
    this.ensureExportDirectory();
  }

  /**
   * Processes a specific financial export
   * Called by the queue or scheduled job
   */
  async processExport(exportId: string): Promise<void> {
    this.logger.log(`Processing financial export: ${exportId}`);

    const financialExport = await this.financialExportRepository.findById(exportId);
    if (!financialExport) {
      this.logger.error(`Financial export not found: ${exportId}`);
      throw new Error(`Financial export not found: ${exportId}`);
    }

    // Check if export is already generated
    if (financialExport.isGenerated()) {
      this.logger.warn(`Financial export ${exportId} is already generated`);
      return;
    }

    try {
      // Generate export file
      const filePath = await this.generateExportFile(financialExport);

      // Update export with file path
      // TODO: Update entity with file path and status
      // await this.financialExportRepository.update({
      //   ...financialExport,
      //   filePath,
      //   status: 'COMPLETED',
      // });

      // Upload to SFTP if configured
      if (financialExport.sftpReference) {
        await this.uploadToSftp(filePath, financialExport);
      }

      this.logger.log(`Financial export ${exportId} processed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to process financial export ${exportId}: ${errorMessage}`,
        errorStack,
      );
      // TODO: Update status to FAILED
      throw error;
    }
  }

  /**
   * Main execution logic
   * Processes all pending exports
   */
  protected async execute(): Promise<void> {
    // Find pending exports
    const pendingExports = await this.findPendingExports();

    if (pendingExports.length === 0) {
      this.logger.debug('No pending financial exports found');
      return;
    }

    this.logger.log(`Found ${pendingExports.length} pending export(s)`);

    // Process each export
    for (const exportRecord of pendingExports) {
      try {
        await this.processExport(exportRecord.id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Failed to process export ${exportRecord.id}: ${errorMessage}`,
          errorStack,
        );
        // Continue with other exports
      }
    }
  }

  /**
   * Finds pending financial exports
   */
  private async findPendingExports(): Promise<FinancialExport[]> {
    // Use repository method to find pending exports
    // Note: This will return empty array until FinancialExport entity has status field
    return await this.financialExportRepository.findPendingExports();
  }

  /**
   * Generates the export file (CSV or JSON)
   */
  private async generateExportFile(financialExport: FinancialExport): Promise<string> {
    this.logger.debug(
      `Generating ${financialExport.format} export for period ${financialExport.periodStart?.toISOString() || 'N/A'} to ${financialExport.periodEnd?.toISOString() || 'N/A'}`,
    );

    // Fetch data for the period
    let invoices: any[] = [];
    let transactions: any[] = [];
    let creditNotes: any[] = [];

    try {
      // Use findByCompanyAndPeriod methods
      const periodStart = financialExport.periodStart || new Date(0);
      const periodEnd = financialExport.periodEnd || new Date();

      invoices = await this.invoiceRepository.findByCompanyAndPeriod(
        financialExport.companyId,
        periodStart,
        periodEnd,
      );

      transactions = await this.transactionRepository.findByCompanyAndPeriod(
        financialExport.companyId,
        periodStart,
        periodEnd,
      );

      // Credit notes: get all invoices first, then find credit notes for those invoices
      const invoiceIds = invoices.map((inv) => inv.id);
      if (invoiceIds.length > 0) {
        creditNotes = await this.creditNoteRepository.findByInvoiceIds(invoiceIds);
      } else {
        creditNotes = [];
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to fetch data for export ${financialExport.id}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }

    // Generate file based on format
    let filePath: string;
    if (financialExport.format === ExportFormat.CSV) {
      filePath = await this.generateCsvFile(financialExport, invoices, transactions, creditNotes);
    } else {
      filePath = await this.generateJsonFile(financialExport, invoices, transactions, creditNotes);
    }

    this.logger.debug(`Export file generated: ${filePath}`);
    return filePath;
  }

  /**
   * Generates a CSV export file
   */
  private async generateCsvFile(
    financialExport: FinancialExport,
    invoices: any[],
    transactions: any[],
    creditNotes: any[],
  ): Promise<string> {
    // TODO: Implement CSV generation
    // For now, create a placeholder file
    const fileName = `export_${financialExport.id}_${Date.now()}.csv`;
    const filePath = path.join(this.exportDir, fileName);

    // Create CSV content
    const csvLines: string[] = [];
    csvLines.push('Type,ID,Date,Amount,Status');

    // Add invoices
    for (const invoice of invoices) {
      csvLines.push(
        `Invoice,${invoice.id},${invoice.issuedAt?.toISOString()},${invoice.total},${invoice.status}`,
      );
    }

    // Add transactions
    for (const transaction of transactions) {
      csvLines.push(
        `Transaction,${transaction.id},${transaction.createdAt.toISOString()},${transaction.totalAmount},${transaction.paymentStatus}`,
      );
    }

    // Add credit notes
    for (const creditNote of creditNotes) {
      csvLines.push(
        `CreditNote,${creditNote.id},${creditNote.issuedAt.toISOString()},${creditNote.amount},Issued`,
      );
    }

    await fs.promises.writeFile(filePath, csvLines.join('\n'), 'utf8');
    return filePath;
  }

  /**
   * Generates a JSON export file
   */
  private async generateJsonFile(
    financialExport: FinancialExport,
    invoices: any[],
    transactions: any[],
    creditNotes: any[],
  ): Promise<string> {
    // TODO: Implement JSON generation
    const fileName = `export_${financialExport.id}_${Date.now()}.json`;
    const filePath = path.join(this.exportDir, fileName);

    const exportData = {
      period: {
        start: financialExport.periodStart?.toISOString() || null,
        end: financialExport.periodEnd?.toISOString() || null,
      },
      invoices,
      transactions,
      creditNotes,
      summary: {
        totalInvoices: invoices.length,
        totalTransactions: transactions.length,
        totalCreditNotes: creditNotes.length,
        totalAmount: invoices.reduce((sum, inv) => sum + inv.total, 0),
      },
    };

    await fs.promises.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
    return filePath;
  }

  /**
   * Uploads export file to SFTP
   */
  private async uploadToSftp(filePath: string, financialExport: FinancialExport): Promise<void> {
    // TODO: Implement SFTP upload
    // This will require an SFTP adapter
    this.logger.warn(`SFTP upload not yet implemented for export ${financialExport.id}`);
  }

  /**
   * Ensures the export directory exists
   */
  private ensureExportDirectory(): void {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
      this.logger.debug(`Created export directory: ${this.exportDir}`);
    }
  }
}
