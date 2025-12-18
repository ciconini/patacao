/**
 * Transaction Domain Events
 *
 * Domain events related to Transaction aggregate.
 */

import { BaseDomainEvent } from '../domain-event.base';

/**
 * TransactionCompleted Event
 * Raised when a transaction is completed (payment processed)
 */
export class TransactionCompletedEvent extends BaseDomainEvent {
  constructor(
    transactionId: string,
    storeId: string,
    invoiceId: string,
    paymentStatus: string,
    paymentMethod: string | undefined,
    totalAmount: number,
    completedBy: string,
  ) {
    super(
      transactionId,
      'Transaction',
      {
        storeId,
        invoiceId,
        paymentStatus,
        paymentMethod,
        totalAmount,
      },
      completedBy,
    );
  }
}

/**
 * StockDecremented Event
 * Raised when stock is decremented for a product
 */
export class StockDecrementedEvent extends BaseDomainEvent {
  constructor(
    productId: string,
    quantity: number,
    reason: string,
    transactionId: string,
    storeId: string,
  ) {
    super(productId, 'Product', {
      quantity,
      reason,
      transactionId,
      storeId,
    });
  }
}
