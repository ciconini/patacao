/**
 * CreditNoteRepository Port (Interface)
 *
 * Repository interface for CreditNote domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 *
 * Implementations should be provided in the Infrastructure layer.
 */

import { CreditNote } from '../domain/credit-note.entity';

export interface CreditNoteRepository {
  /**
   * Saves a CreditNote entity (creates or updates)
   *
   * @param creditNote - CreditNote domain entity to save
   * @returns Saved CreditNote entity
   */
  save(creditNote: CreditNote): Promise<CreditNote>;

  /**
   * Finds credit notes by invoice ID
   *
   * @param invoiceId - Invoice ID
   * @returns Array of credit notes
   */
  findByInvoiceId(invoiceId: string): Promise<CreditNote[]>;

  /**
   * Finds credit notes by multiple invoice IDs
   *
   * @param invoiceIds - Array of invoice IDs
   * @returns Array of credit notes
   */
  findByInvoiceIds(invoiceIds: string[]): Promise<CreditNote[]>;

  /**
   * Sums the total amount of credit notes for an invoice
   *
   * @param invoiceId - Invoice ID
   * @returns Total amount of credit notes
   */
  sumByInvoiceId(invoiceId: string): Promise<number>;
}
