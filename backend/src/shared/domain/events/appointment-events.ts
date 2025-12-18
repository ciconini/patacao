/**
 * Appointment Domain Events
 *
 * Domain events related to Appointment aggregate.
 */

import { BaseDomainEvent } from '../domain-event.base';

/**
 * AppointmentCreated Event
 * Raised when a new appointment is created
 */
export class AppointmentCreatedEvent extends BaseDomainEvent {
  constructor(
    appointmentId: string,
    customerId: string,
    petId: string | undefined,
    serviceId: string,
    scheduledAt: Date,
    createdBy: string,
  ) {
    super(
      appointmentId,
      'Appointment',
      {
        customerId,
        petId,
        serviceId,
        scheduledAt: scheduledAt.toISOString(),
      },
      createdBy,
    );
  }
}

/**
 * AppointmentConfirmed Event
 * Raised when an appointment is confirmed
 */
export class AppointmentConfirmedEvent extends BaseDomainEvent {
  constructor(appointmentId: string, confirmedBy: string) {
    super(appointmentId, 'Appointment', {}, confirmedBy);
  }
}

/**
 * AppointmentCompleted Event
 * Raised when an appointment is completed
 */
export class AppointmentCompletedEvent extends BaseDomainEvent {
  constructor(appointmentId: string, completedBy: string) {
    super(appointmentId, 'Appointment', {}, completedBy);
  }
}

/**
 * AppointmentCancelled Event
 * Raised when an appointment is cancelled
 */
export class AppointmentCancelledEvent extends BaseDomainEvent {
  constructor(appointmentId: string, reason: string | undefined, cancelledBy: string) {
    super(
      appointmentId,
      'Appointment',
      {
        reason,
      },
      cancelledBy,
    );
  }
}
