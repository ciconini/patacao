/**
 * Confirm Appointment Use Case (UC-SVC-003)
 *
 * Application use case for confirming a booked appointment.
 * This use case orchestrates domain entities and domain services to confirm appointments
 * and create inventory reservations for services that consume inventory.
 *
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, or Owner role)
 * - Validate appointment exists and is in booked status
 * - Validate store access
 * - Check inventory availability for services that consume inventory
 * - Create inventory reservations using InventoryReservationDomainService
 * - Update appointment status to confirmed
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
import { InventoryReservation } from '../../inventory/domain/inventory-reservation.entity';
import { Product } from '../../inventory/domain/product.entity';
import { InventoryReservationDomainService } from '../../inventory/domain/inventory-reservation.domain-service';
import { InventoryAvailabilityDomainService } from '../../inventory/domain/inventory-availability.domain-service';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface AppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
  update(appointment: Appointment): Promise<Appointment>;
}

export interface AppointmentServiceLineRepository {
  findByAppointmentId(appointmentId: string): Promise<
    Array<{
      serviceId: string;
      quantity: number;
    }>
  >;
}

export interface ServiceRepository {
  findById(id: string): Promise<Service | null>;
}

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  getOnHand(productId: string): Promise<number>;
}

export interface InventoryReservationRepository {
  save(reservation: InventoryReservation): Promise<InventoryReservation>;
  findByProduct(productId: string): Promise<InventoryReservation[]>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
  hasStoreAccess(userId: string, storeId: string): Promise<boolean>;
}

// Input model
export interface ConfirmAppointmentInput {
  id: string;
  performedBy: string; // User ID
}

// Output model
export interface ConfirmAppointmentOutput {
  id: string;
  status: AppointmentStatus;
  confirmedAt: Date;
  confirmedBy: string;
  inventoryReservations: Array<{
    id: string;
    productId: string;
    quantity: number;
  }>;
  updatedAt: Date;
}

// Result type
export interface ConfirmAppointmentResult {
  success: boolean;
  appointment?: ConfirmAppointmentOutput;
  error?: {
    code: string;
    message: string;
  };
}

// Application errors
export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
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
 * Confirm Appointment Use Case
 */
export class ConfirmAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly appointmentServiceLineRepository: AppointmentServiceLineRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly productRepository: ProductRepository,
    private readonly inventoryReservationRepository: InventoryReservationRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly inventoryReservationDomainService: InventoryReservationDomainService,
    private readonly inventoryAvailabilityDomainService: InventoryAvailabilityDomainService,
    private readonly auditLogDomainService: AuditLogDomainService,
    private readonly generateId: () => string = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  ) {}

  /**
   * Executes the confirm appointment use case
   *
   * @param input - Input data for confirming appointment
   * @returns Result containing confirmed appointment or error
   */
  async execute(input: ConfirmAppointmentInput): Promise<ConfirmAppointmentResult> {
    try {
      // 1. Validate user exists and has required role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Load appointment
      const appointment = await this.appointmentRepository.findById(input.id);
      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }

      // 3. Validate appointment status is booked
      if (appointment.status !== AppointmentStatus.BOOKED) {
        throw new ValidationError('Only booked appointments can be confirmed');
      }

      // 4. Verify user has store access
      const hasAccess = await this.currentUserRepository.hasStoreAccess(
        input.performedBy,
        appointment.storeId,
      );
      if (!hasAccess) {
        throw new ForbiddenError("You do not have access to this appointment's store");
      }

      // 5. Check if user can override (Manager or Owner)
      const canOverride = await this.canOverrideInsufficientStock(input.performedBy);

      // 6. Load appointment service lines
      const serviceLines = await this.appointmentServiceLineRepository.findByAppointmentId(
        appointment.id,
      );

      // 7. Check inventory availability and create reservations
      const reservations = await this.createInventoryReservations(
        appointment,
        serviceLines,
        canOverride,
      );

      // 8. Confirm appointment
      appointment.confirm();

      // 9. Persist updated appointment
      const updatedAppointment = await this.appointmentRepository.update(appointment);

      // 10. Create audit log entry
      await this.createAuditLog(updatedAppointment, reservations, input.performedBy);

      // 11. Return success result
      return {
        success: true,
        appointment: {
          id: updatedAppointment.id,
          status: updatedAppointment.status,
          confirmedAt: new Date(),
          confirmedBy: input.performedBy,
          inventoryReservations: reservations.map((r) => ({
            id: r.id,
            productId: r.productId,
            quantity: r.quantity,
          })),
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

    const hasRequiredRole = user.roleIds.some((roleId) => {
      try {
        const role = RoleId.fromString(roleId);
        if (!role) return false;
        return role.isStaff() || role.isManager() || role.isOwner();
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError('Only Staff, Manager, or Owner role can confirm appointments');
    }
  }

  /**
   * Checks if user can override insufficient stock (Manager or Owner)
   */
  private async canOverrideInsufficientStock(userId: string): Promise<boolean> {
    const user = await this.currentUserRepository.findById(userId);
    if (!user) return false;

    return user.roleIds.some((roleId) => {
      try {
        const role = RoleId.fromString(roleId);
        if (!role) return false;
        return role.isManager() || role.isOwner();
      } catch {
        return false;
      }
    });
  }

  /**
   * Creates inventory reservations for services that consume inventory
   */
  private async createInventoryReservations(
    appointment: Appointment,
    serviceLines: Array<{ serviceId: string; quantity: number }>,
    allowOverride: boolean,
  ): Promise<InventoryReservation[]> {
    const reservations: InventoryReservation[] = [];

    for (const line of serviceLines) {
      const service = await this.serviceRepository.findById(line.serviceId);
      if (!service || !service.consumesInventory) {
        continue;
      }

      // Get current stock and reservations
      const products = new Map<string, Product>();
      const currentStockLevels = new Map<string, number>();
      const allReservations: InventoryReservation[] = [];

      for (const consumedItem of service.consumedItems) {
        const product = await this.productRepository.findById(consumedItem.productId);
        if (!product) {
          throw new NotFoundError(`Product with ID ${consumedItem.productId} not found`);
        }

        products.set(product.id, product);
        const onHand = await this.productRepository.getOnHand(product.id);
        currentStockLevels.set(product.id, onHand);

        // Load existing reservations for this product
        const productReservations = await this.inventoryReservationRepository.findByProduct(
          product.id,
        );
        allReservations.push(...productReservations);
      }

      // Check availability using domain service
      const availabilityResult =
        this.inventoryAvailabilityDomainService.validateServiceAvailability(
          service,
          products,
          currentStockLevels,
          allReservations,
        );

      if (!availabilityResult.isAvailable && !allowOverride) {
        const unavailableProducts = availabilityResult.unavailableProducts
          .map(
            (p) =>
              `${p.productName} (available: ${p.availableStock}, required: ${p.requiredQuantity})`,
          )
          .join(', ');

        throw new ConflictError(
          `Insufficient stock for service ${service.name}. ${unavailableProducts}`,
        );
      }

      // Create reservations for each consumed item
      for (const consumedItem of service.consumedItems) {
        const product = products.get(consumedItem.productId)!;
        const quantity = consumedItem.quantity * line.quantity;
        const availableStock =
          currentStockLevels.get(product.id)! -
          allReservations
            .filter((r) => r.productId === product.id && !r.isExpired())
            .reduce((sum, r) => sum + r.quantity, 0);

        // Use domain service to create reservation
        const reservationResult =
          this.inventoryReservationDomainService.createReservationForAppointment(
            this.generateId(),
            product,
            quantity,
            appointment,
            availableStock,
            appointment.endAt, // Expires at appointment end
            allowOverride,
          );

        if (!reservationResult.canCreate && !allowOverride) {
          throw new ConflictError(
            `Cannot create reservation for ${product.name}: ${reservationResult.errors.join('; ')}`,
          );
        }

        if (reservationResult.reservation) {
          const savedReservation = await this.inventoryReservationRepository.save(
            reservationResult.reservation,
          );
          reservations.push(savedReservation);
        }
      }
    }

    return reservations;
  }

  /**
   * Creates audit log entry
   */
  private async createAuditLog(
    appointment: Appointment,
    reservations: InventoryReservation[],
    performedBy: string,
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
            reservationsCount: reservations.length,
          },
        },
        new Date(),
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
  private handleError(error: unknown): ConfirmAppointmentResult {
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
