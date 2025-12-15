/**
 * UnitOfWork Port (Interface)
 * 
 * Repository interface for managing transaction boundaries and coordinating
 * multiple repository operations within a single transaction.
 * 
 * This is a port in the Hexagonal Architecture pattern.
 * Implementations should be provided in the Infrastructure layer.
 * 
 * The Unit of Work pattern maintains a list of objects affected by a business
 * transaction and coordinates writing out changes and resolving concurrency problems.
 */

export interface UnitOfWork {
  /**
   * Starts a new transaction
   * All repository operations performed within this transaction will be atomic
   * 
   * @returns Promise that resolves when transaction is started
   */
  start(): Promise<void>;

  /**
   * Commits the current transaction
   * All changes made within the transaction will be persisted
   * 
   * @returns Promise that resolves when transaction is committed
   * @throws Error if no transaction is active or commit fails
   */
  commit(): Promise<void>;

  /**
   * Rolls back the current transaction
   * All changes made within the transaction will be discarded
   * 
   * @returns Promise that resolves when transaction is rolled back
   * @throws Error if no transaction is active or rollback fails
   */
  rollback(): Promise<void>;

  /**
   * Executes a function within a transaction
   * Automatically commits on success or rolls back on error
   * 
   * For Firestore, the function receives a transaction context that can be
   * passed to repository methods to ensure they operate within the same transaction.
   * 
   * @param fn - Function to execute within the transaction
   * @returns Promise that resolves with the function's return value
   * @throws Error if the function throws or transaction fails
   */
  execute<T>(fn: (context?: any) => Promise<T>): Promise<T>;

  /**
   * Checks if a transaction is currently active
   * 
   * @returns True if a transaction is active
   */
  isActive(): boolean;

  /**
   * Gets the transaction context
   * This can be passed to repositories to ensure they operate within the same transaction
   * 
   * @returns Transaction context object (implementation-specific)
   */
  getTransaction(): any;
}

