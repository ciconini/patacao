/**
 * Cancel Appointment Use Case (UC-SVC-005)
 * 
 * Application use case for cancelling a booked, confirmed, or checked-in appointment.
 * This use case orchestrates domain entities to cancel appointments and release
 * inventory reservations if the appointment was confirmed.
 * 
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, or Owner role)
 * - Validate appointment exists and is in valid status
 * - Validate store access
 * - Release inventory reservations if appointment was confirmed
 * - Update appointment status to cancelled
 * - Record cancellation reason and no-show flag
 * - Persist changes via repositories
 * - Create audit log entry
 * 
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Appointment, AppointmentStatus } from '../domain/appointment.entity';
import { InventoryReservation } from '../../inventory/domain/inventory-reservation.entity';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface AppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
  update(appointment: Appointment): Promise<Appointment>;
}

export interface InventoryReservationRepository {
  findByAppointmentId(appointmentId: string): Promise<InventoryReservation[]>;
  delete(id: string): Promise<void>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
  hasStoreAccess(userId: string, storeId: string): Promise<boolean>;
}

// Input model
export interface CancelAppointmentInput {
  id: string;
  reason?: string;
  markNoShow?: boolean;
  performedBy: string; // User ID
}

// Output model
export interface CancelAppointmentOutput {
  id: string;
  status: AppointmentStatus;
  cancelledAt: Date;
  cancelledBy: string;
  reason?: string;
  noShow: boolean;
  updatedAt: Date;
}

// Result type
export interface CancelAppointmentResult {
  success: boolean;
  appointment?: CancelAppointmentOutput;
  error?: {
    code: string;
    message: string;
  };
}

// Application errors
export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message: string = 'Authentication required') {
    super('UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message: string = 'Access forbidden') {
    super('FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

/**
 * Cancel Appointment Use Case
 */
export class CancelAppointmentUseCase {
  private static readonly MAX_REASON_LENGTH = 500;

  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly inventoryReservationRepository: InventoryReservationRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly auditLogDomainService: AuditLogDomainService,
    private readonly generateId: () => string = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  ) {}

  /**
   * Executes the cancel appointment use case
   * 
   * @param input - Input data for cancelling appointment
   * @returns Result containing cancelled appointment or error
   */
  async execute(input: CancelAppointmentInput): Promise<CancelAppointmentResult> {
    try {
      // 1. Validate user exists and has required role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Load appointment
      const appointment = await this.appointmentRepository.findById(input.id);
      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }

      // 3. Validate appointment status
      if (appointment.status === AppointmentStatus.COMPLETED) {
        throw new ValidationError('Cannot cancel a completed appointment');
      }

      if (appointment.status === AppointmentStatus.CANCELLED) {
        throw new ValidationError('Appointment is already cancelled');
      }

      // 4. Verify user has store access
      const hasAccess = await this.currentUserRepository.hasStoreAccess(
        input.performedBy,
        appointment.storeId
      );
      if (!hasAccess) {
        throw new ForbiddenError('You do not have access to this appointment\'s store');
      }

      // 5. Validate reason length
      if (input.reason && input.reason.length > CancelAppointmentUseCase.MAX_REASON_LENGTH) {
        throw new ValidationError(
          `Reason cannot exceed ${CancelAppointmentUseCase.MAX_REASON_LENGTH} characters`
        );
      }

      // 6. Release inventory reservations if appointment was confirmed or checked-in
      if (appointment.status === AppointmentStatus.CONFIRMED || 
          appointment.status === AppointmentStatus.CHECKED_IN) {
        await this.releaseInventoryReservations(appointment.id);
      }

      // 7. Cancel appointment
      appointment.cancel();

      // 8. Update notes with cancellation reason if provided
      // Note: Appointment entity doesn't have a separate reason field
      // We'll append to notes if needed, or this could be stored separately
      if (input.reason) {
        const currentNotes = appointment.notes || '';
        const cancellationNote = `[CANCELLED] ${input.reason}`;
        appointment.updateNotes(
          currentNotes ? `${currentNotes}\n${cancellationNote}` : cancellationNote
        );
      }

      // 9. Persist updated appointment
      const updatedAppointment = await this.appointmentRepository.update(appointment);

      // 10. Create audit log entry
      await this.createAuditLog(
        updatedAppointment,
        input.reason,
        input.markNoShow || false,
        input.performedBy
      );

      // 11. Return success result
      return {
        success: true,
        appointment: {
          id: updatedAppointment.id,
          status: updatedAppointment.status,
          cancelledAt: new Date(),
          cancelledBy: input.performedBy,
          reason: input.reason,
          noShow: input.markNoShow || false,
          updatedAt: updatedAppointment.updatedAt,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization (must have Staff, Manager, or Owner role)
   */
  private async validateUserAuthorization(userId: string): Promise<void> {
    const user = await this.currentUserRepository.findById(userId);
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const hasRequiredRole = user.roleIds.some(roleId => {
      try {
        const role = RoleId.fromString(roleId);
        if (!role) return false;
        return role.isStaff() || role.isManager() || role.isOwner();
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError('Only Staff, Manager, or Owner role can cancel appointments');
    }
  }

  /**
   * Releases inventory reservations for the appointment
   */
  private async releaseInventoryReservations(appointmentId: string): Promise<void> {
    const reservations = await this.inventoryReservationRepository.findByAppointmentId(appointmentId);
    
    for (const reservation of reservations) {
      // Delete reservation (releasing the hold)
      await this.inventoryReservationRepository.delete(reservation.id);
    }
  }

  /**
   * Creates audit log entry
   */
  private async createAuditLog(
    appointment: Appointment,
    reason: string | undefined,
    noShow: boolean,
    performedBy: string
  ): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Appointment',
        appointment.id,
        AuditAction.DELETE, // Using DELETE for cancellation
        performedBy,
        {
          after: {
            id: appointment.id,
            status: appointment.status,
            reason,
            noShow,
          },
        },
        new Date()
      );

      if (result.auditLog) {
        await this.auditLogRepository.save(result.auditLog);
      }
    } catch (error: any) {
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): CancelAppointmentResult {
    if (error instanceof ApplicationError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    };
  }
}

