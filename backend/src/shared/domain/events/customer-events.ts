/**
 * Customer Domain Events
 *
 * Domain events related to Customer aggregate.
 */

import { BaseDomainEvent } from '../domain-event.base';

/**
 * CustomerCreated Event
 * Raised when a new customer is created
 */
export class CustomerCreatedEvent extends BaseDomainEvent {
  constructor(
    customerId: string,
    fullName: string,
    email: string | undefined,
    phone: string | undefined,
    createdBy: string,
  ) {
    super(
      customerId,
      'Customer',
      {
        fullName,
        email,
        phone,
      },
      createdBy,
    );
  }
}

/**
 * CustomerArchived Event
 * Raised when a customer is archived
 */
export class CustomerArchivedEvent extends BaseDomainEvent {
  constructor(customerId: string, archivedBy: string) {
    super(customerId, 'Customer', {}, archivedBy);
  }
}
