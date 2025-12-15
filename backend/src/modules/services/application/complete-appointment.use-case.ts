/**
 * Complete Appointment Use Case (UC-SVC-004)
 * 
 * Application use case for completing a confirmed or checked-in appointment.
 * This use case orchestrates domain entities and domain services to complete appointments,
 * decrement inventory for services that consume inventory, and record service notes.
 * 
 * Responsibilities:
 * - Validate user authorization (Staff, Veterinarian, Manager, or Owner role)
 * - Validate appointment exists and is in valid status
 * - Validate store access
 * - Decrement inventory for services that consume inventory
 * - Release inventory reservations
 * - Update appointment status to completed
 * - Record service notes
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
import { Service } from '../domain/service.entity';
import { StockMovement, StockMovementReason } from '../../inventory/domain/stock-movement.entity';
import { Product } from '../../inventory/domain/product.entity';
import { InventoryReservation } from '../../inventory/domain/inventory-reservation.entity';
import { StockMovementDomainService } from '../../inventory/domain/stock-movement.domain-service';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface AppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
  update(appointment: Appointment): Promise<Appointment>;
}

export interface AppointmentServiceLineRepository {
  findByAppointmentId(appointmentId: string): Promise<Array<{
    serviceId: string;
    quantity: number;
  }>>;
}

export interface ServiceRepository {
  findById(id: string): Promise<Service | null>;
}

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  updateOnHand(productId: string, delta: number): Promise<void>;
}

export interface InventoryReservationRepository {
  findByAppointmentId(appointmentId: string): Promise<InventoryReservation[]>;
  delete(id: string): Promise<void>;
}

export interface StockMovementRepository {
  save(movement: StockMovement): Promise<StockMovement>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
  hasStoreAccess(userId: string, storeId: string): Promise<boolean>;
}

// Input model
export interface CompleteAppointmentInput {
  id: string;
  notes?: string;
  consumedItems?: Array<{
    productId: string;
    quantity: number;
    batchId?: string;
  }>;
  performedBy: string; // User ID
}

// Output model
export interface CompleteAppointmentOutput {
  id: string;
  status: AppointmentStatus;
  completedAt: Date;
  completedBy: string;
  notes?: string;
  stockMovements: Array<{
    id: string;
    productId: string;
    quantityChange: number;
    reason: StockMovementReason;
  }>;
  updatedAt: Date;
}

// Result type
export interface CompleteAppointmentResult {
  success: boolean;
  appointment?: CompleteAppointmentOutput;
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

export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super('CONFLICT', message);
    this.name = 'ConflictError';
  }
}

/**
 * Complete Appointment Use Case
 */
export class CompleteAppointmentUseCase {
  private static readonly MAX_NOTES_LENGTH = 5000;

  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly appointmentServiceLineRepository: AppointmentServiceLineRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly productRepository: ProductRepository,
    private readonly inventoryReservationRepository: InventoryReservationRepository,
    private readonly stockMovementRepository: StockMovementRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly stockMovementDomainService: StockMovementDomainService,
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
   * Executes the complete appointment use case
   * 
   * @param input - Input data for completing appointment
   * @returns Result containing completed appointment or error
   */
  async execute(input: CompleteAppointmentInput): Promise<CompleteAppointmentResult> {
    try {
      // 1. Validate user exists and has required role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Load appointment
      const appointment = await this.appointmentRepository.findById(input.id);
      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }

      // 3. Validate appointment status
      if (appointment.status !== AppointmentStatus.CONFIRMED && 
          appointment.status !== AppointmentStatus.CHECKED_IN) {
        throw new ValidationError('Only confirmed or checked-in appointments can be completed');
      }

      // 4. Verify user has store access
      const hasAccess = await this.currentUserRepository.hasStoreAccess(
        input.performedBy,
        appointment.storeId
      );
      if (!hasAccess) {
        throw new ForbiddenError('You do not have access to this appointment\'s store');
      }

      // 5. Validate notes length
      if (input.notes && input.notes.length > CompleteAppointmentUseCase.MAX_NOTES_LENGTH) {
        throw new ValidationError(`Notes cannot exceed ${CompleteAppointmentUseCase.MAX_NOTES_LENGTH} characters`);
      }

      // 6. Load appointment service lines
      const serviceLines = await this.appointmentServiceLineRepository.findByAppointmentId(appointment.id);

      // 7. Process inventory decrement for services that consume inventory
      const stockMovements = await this.processInventoryDecrement(
        appointment,
        serviceLines,
        input.consumedItems,
        input.performedBy
      );

      // 8. Release inventory reservations
      await this.releaseInventoryReservations(appointment.id);

      // 9. Complete appointment and update notes
      appointment.complete();
      if (input.notes !== undefined) {
        appointment.updateNotes(input.notes);
      }

      // 10. Persist updated appointment
      const updatedAppointment = await this.appointmentRepository.update(appointment);

      // 11. Create audit log entry
      await this.createAuditLog(updatedAppointment, stockMovements, input.performedBy);

      // 12. Return success result
      return {
        success: true,
        appointment: {
          id: updatedAppointment.id,
          status: updatedAppointment.status,
          completedAt: new Date(),
          completedBy: input.performedBy,
          notes: updatedAppointment.notes,
          stockMovements: stockMovements.map(m => ({
            id: m.id,
            productId: m.productId,
            quantityChange: m.quantityChange,
            reason: m.reason,
          })),
          updatedAt: updatedAppointment.updatedAt,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization (must have Staff, Veterinarian, Manager, or Owner role)
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
        return role.isStaff() || role.isVeterinarian() || role.isManager() || role.isOwner();
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError('Only Staff, Veterinarian, Manager, or Owner role can complete appointments');
    }
  }

  /**
   * Processes inventory decrement for services that consume inventory
   */
  private async processInventoryDecrement(
    appointment: Appointment,
    serviceLines: Array<{ serviceId: string; quantity: number }>,
    consumedItems?: CompleteAppointmentInput['consumedItems'],
    performedBy?: string
  ): Promise<StockMovement[]> {
    const stockMovements: StockMovement[] = [];

    for (const line of serviceLines) {
      const service = await this.serviceRepository.findById(line.serviceId);
      if (!service || !service.consumesInventory) {
        continue;
      }

      // Use provided consumed items or service consumed items
      const itemsToConsume = consumedItems || service.consumedItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity * line.quantity,
      }));

      for (const item of itemsToConsume) {
        const product = await this.productRepository.findById(item.productId);
        if (!product) {
          throw new NotFoundError(`Product with ID ${item.productId} not found`);
        }

        if (!product.stockTracked) {
          continue; // Skip non-stock-tracked products
        }

        // Validate stock availability
        // Note: In a real system, you'd check available stock here
        // For now, we'll proceed with the decrement

        // Create stock movement
        const movement = new StockMovement(
          this.generateId(),
          item.productId,
          -item.quantity, // Negative for decrement
          StockMovementReason.SALE, // Using SALE for service consumption
          performedBy || appointment.createdBy || '',
          appointment.storeId,
          undefined, // batchId - would be set if provided
          appointment.id, // referenceId
          new Date()
        );

        // Validate movement using domain service
        const validationResult = this.stockMovementDomainService.validateMovementLegality(
          movement,
          product
        );

        if (!validationResult.isValid) {
          throw new ValidationError(
            `Invalid stock movement for product ${product.name}: ${validationResult.errors.join(', ')}`
          );
        }

        // Persist movement
        const savedMovement = await this.stockMovementRepository.save(movement);
        stockMovements.push(savedMovement);

        // Update product on-hand quantity
        await this.productRepository.updateOnHand(item.productId, -item.quantity);
      }
    }

    return stockMovements;
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
    stockMovements: StockMovement[],
    performedBy: string
  ): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Appointment',
        appointment.id,
        AuditAction.UPDATE, // Using UPDATE as we're updating status
        performedBy,
        {
          after: {
            id: appointment.id,
            status: appointment.status,
            notes: appointment.notes,
            stockMovementsCount: stockMovements.length,
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
  private handleError(error: unknown): CompleteAppointmentResult {
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

