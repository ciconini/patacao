/**
 * TransactionRepository Port (Interface)
 * 
 * Repository interface for Transaction domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 * 
 * Implementations should be provided in the Infrastructure layer.
 */

import { Transaction } from '../domain/transaction.entity';

export interface TransactionRepository {
  /**
   * Saves a Transaction entity (creates or updates)
   * 
   * @param transaction - Transaction domain entity to save
   * @returns Saved Transaction entity
   */
  save(transaction: Transaction): Promise<Transaction>;

  /**
   * Updates an existing Transaction entity
   * 
   * @param transaction - Transaction domain entity to update
   * @returns Updated Transaction entity
   */
  update(transaction: Transaction): Promise<Transaction>;

  /**
   * Finds a Transaction by ID
   * 
   * @param id - Transaction ID
   * @returns Transaction entity or null if not found
   */
  findById(id: string): Promise<Transaction | null>;

  /**
   * Finds transactions by invoice ID
   * 
   * @param invoiceId - Invoice ID
   * @returns Array of transactions (with minimal fields)
   */
  findByInvoiceId(invoiceId: string): Promise<Array<{ id: string; status: string }>>;

  /**
   * Finds transactions by company and period
   * 
   * @param companyId - Company ID
   * @param start - Start date of period
   * @param end - End date of period
   * @returns Array of transactions
   */
  findByCompanyAndPeriod(
    companyId: string,
    start: Date,
    end: Date
  ): Promise<Transaction[]>;
}

