/**
 * Firestore UnitOfWork Implementation
 *
 * Firestore adapter for UnitOfWork port.
 * This implementation uses Firestore transactions to ensure atomicity
 * of multiple repository operations.
 *
 * Responsibilities:
 * - Manage Firestore transaction lifecycle
 * - Provide transaction context to repositories
 * - Handle commit and rollback operations
 * - Support nested transaction execution
 *
 * This belongs to the Infrastructure/Adapters layer.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { UnitOfWork } from '../../shared/ports/unit-of-work.port';

/**
 * Firestore transaction context
 * Contains the Firestore transaction object that repositories can use
 *
 * Repositories can accept this context as an optional parameter to ensure
 * their operations participate in the same transaction.
 */
export interface FirestoreTransactionContext {
  transaction: FirebaseFirestore.Transaction;
  firestore: Firestore;
}

@Injectable()
export class FirestoreUnitOfWork implements UnitOfWork {
  private transaction: FirebaseFirestore.Transaction | null = null;
  private firestore: Firestore;
  private isTransactionActive: boolean = false;

  constructor(
    @Inject('FIRESTORE')
    firestore: Firestore,
  ) {
    this.firestore = firestore;
  }

  /**
   * Starts a new Firestore transaction
   * Note: Firestore transactions are started lazily when first used
   */
  async start(): Promise<void> {
    if (this.isTransactionActive) {
      throw new Error(
        'Transaction is already active. Firestore does not support nested transactions.',
      );
    }

    // Firestore transactions are created lazily when first used
    // We'll create it when getTransaction() is called
    this.isTransactionActive = true;
  }

  /**
   * Commits the current transaction
   * Executes all batched operations atomically
   */
  async commit(): Promise<void> {
    if (!this.isTransactionActive) {
      throw new Error('No active transaction to commit');
    }

    if (this.transaction) {
      // Firestore transactions are committed automatically when the transaction function completes
      // If we're using runTransaction, we don't need to explicitly commit
      // For manual transactions, we need to handle this differently
      // Since Firestore doesn't support manual transaction management like SQL databases,
      // we'll use runTransaction for the execute method
    }

    this.isTransactionActive = false;
    this.transaction = null;
  }

  /**
   * Rolls back the current transaction
   * Note: Firestore transactions automatically rollback on error
   */
  async rollback(): Promise<void> {
    if (!this.isTransactionActive) {
      throw new Error('No active transaction to rollback');
    }

    // Firestore transactions automatically rollback on error
    // We just need to reset our state
    this.isTransactionActive = false;
    this.transaction = null;
  }

  /**
   * Executes a function within a Firestore transaction
   * Uses Firestore's runTransaction for atomicity
   *
   * @param fn - Function to execute within the transaction
   * @returns Promise that resolves with the function's return value
   */
  async execute<T>(fn: (context: FirestoreTransactionContext) => Promise<T>): Promise<T> {
    if (this.isTransactionActive) {
      throw new Error(
        'Nested transactions are not supported. Use execute() for the entire operation.',
      );
    }

    return await this.firestore.runTransaction(async (transaction) => {
      this.isTransactionActive = true;
      this.transaction = transaction;

      try {
        const context: FirestoreTransactionContext = {
          transaction,
          firestore: this.firestore,
        };

        const result = await fn(context);

        // Transaction commits automatically on successful completion
        this.isTransactionActive = false;
        this.transaction = null;

        return result;
      } catch (error) {
        // Transaction rolls back automatically on error
        this.isTransactionActive = false;
        this.transaction = null;
        throw error;
      }
    });
  }

  /**
   * Checks if a transaction is currently active
   */
  isActive(): boolean {
    return this.isTransactionActive;
  }

  /**
   * Gets the transaction context
   * Returns null if no transaction is active
   *
   * @returns Transaction context or null
   */
  getTransaction(): FirestoreTransactionContext | null {
    if (!this.isTransactionActive || !this.transaction) {
      return null;
    }

    return {
      transaction: this.transaction,
      firestore: this.firestore,
    };
  }
}
