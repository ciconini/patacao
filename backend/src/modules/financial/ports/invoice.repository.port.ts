/**
 * InvoiceRepository Port (Interface)
 *
 * Repository interface for Invoice domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 *
 * Implementations should be provided in the Infrastructure layer.
 */

import { Invoice } from '../domain/invoice.entity';

export interface InvoiceRepository {
  /**
   * Saves an Invoice entity (creates or updates)
   *
   * @param invoice - Invoice domain entity to save
   * @returns Saved Invoice entity
   */
  save(invoice: Invoice): Promise<Invoice>;

  /**
   * Updates an existing Invoice entity
   *
   * @param invoice - Invoice domain entity to update
   * @returns Updated Invoice entity
   */
  update(invoice: Invoice): Promise<Invoice>;

  /**
   * Finds an Invoice by ID
   *
   * @param id - Invoice ID
   * @returns Invoice entity or null if not found
   */
  findById(id: string): Promise<Invoice | null>;

  /**
   * Generates the next sequential invoice number for a company and store
   *
   * @param companyId - Company ID
   * @param storeId - Store ID
   * @returns Next invoice number
   */
  generateInvoiceNumber(companyId: string, storeId: string): Promise<string>;

  /**
   * Finds an invoice by invoice number and company
   *
   * @param invoiceNumber - Invoice number
   * @param companyId - Company ID
   * @returns Invoice entity or null if not found
   */
  findByInvoiceNumber(invoiceNumber: string, companyId: string): Promise<Invoice | null>;

  /**
   * Finds invoices by company and period
   *
   * @param companyId - Company ID
   * @param start - Start date of period
   * @param end - End date of period
   * @returns Array of invoices
   */
  findByCompanyAndPeriod(companyId: string, start: Date, end: Date): Promise<Invoice[]>;
}
