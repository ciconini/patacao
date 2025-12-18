/**
 * Create Inventory Reservation Use Case (UC-INV-003)
 *
 * Application use case for creating inventory reservations.
 * This use case orchestrates domain entities and domain services to reserve stock
 * for appointments or transactions.
 *
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, or Owner role)
 * - Validate product exists and is stock-tracked
 * - Validate target (appointment or transaction) exists
 * - Check available stock using InventoryAvailabilityDomainService
 * - Create inventory reservation using InventoryReservationDomainService
 * - Persist reservation via repository
 * - Create audit log entry
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { InventoryReservation } from '../domain/inventory-reservation.entity';
import { Product } from '../domain/product.entity';
import { InventoryReservationDomainService } from '../domain/inventory-reservation.domain-service';
import { InventoryAvailabilityDomainService } from '../domain/inventory-availability.domain-service';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { Appointment } from '../../services/domain/appointment.entity';
import { Transaction } from '../../financial/domain/transaction.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  getOnHand(productId: string, locationId?: string): Promise<number>; // Get stock at location (or aggregate if no location)
}

export interface AppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
}

export interface TransactionRepository {
  findById(id: string): Promise<Transaction | null>;
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
}

// Input model
export interface CreateInventoryReservationInput {
  productId: string;
  quantity: number;
  reservedForId: string; // Appointment or transaction ID
  reservedForType: 'appointment' | 'transaction';
  expiresAt?: Date;
  performedBy: string; // User ID
}

// Output model
export interface CreateInventoryReservationOutput {
  id: string;
  productId: string;
  quantity: number;
  reservedForId: string;
  reservedForType: 'appointment' | 'transaction';
  expiresAt?: Date;
  createdAt: Date;
}

// Result type
export interface CreateInventoryReservationResult {
  success: boolean;
  reservation?: CreateInventoryReservationOutput;
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
 * Create Inventory Reservation Use Case
 */
export class CreateInventoryReservationUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly appointmentRepository: AppointmentRepository,
    private readonly transactionRepository: TransactionRepository,
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
   * Executes the create inventory reservation use case
   *
   * @param input - Input data for creating reservation
   * @returns Result containing reservation details or error
   */
  async execute(input: CreateInventoryReservationInput): Promise<CreateInventoryReservationResult> {
    try {
      // 1. Validate user exists and has required role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate required fields
      this.validateRequiredFields(input);

      // 3. Validate and load product
      const product = await this.validateAndLoadProduct(input.productId);

      // 4. Validate product is stock-tracked
      if (!product.stockTracked) {
        throw new ValidationError(
          `Product ${product.name} (${product.sku}) is not stock-tracked. Reservations can only be created for stock-tracked products.`,
        );
      }

      // 5. Validate target (appointment or transaction) exists
      const target = await this.validateAndLoadTarget(input.reservedForId, input.reservedForType);

      // 6. Validate expiry date if provided
      if (input.expiresAt) {
        const now = new Date();
        if (input.expiresAt <= now) {
          throw new ValidationError('Expiry must be in the future');
        }
      }

      // 7. Get current stock and active reservations
      const currentStock = await this.getCurrentStock(input.productId);
      const activeReservations = await this.getActiveReservations(input.productId);

      // 8. Calculate available stock
      const availableStock = this.inventoryAvailabilityDomainService.calculateAvailableStock(
        product,
        currentStock,
        activeReservations,
        new Date(),
      );

      // 9. Check if user can override (Manager or Owner)
      const canOverride = await this.canUserOverride(input.performedBy);

      // 10. Create reservation using domain service
      let reservation: InventoryReservation;

      if (input.reservedForType === 'appointment') {
        const appointment = target as Appointment;
        const result = this.inventoryReservationDomainService.createReservationForAppointment(
          this.generateId(),
          product,
          input.quantity,
          appointment,
          availableStock,
          input.expiresAt,
          canOverride,
          new Date(),
        );

        if (!result.canCreate) {
          if (result.requiresOverride) {
            throw new ConflictError(
              `Insufficient stock. Available: ${availableStock}, Required: ${input.quantity}. Manager override required.`,
            );
          }
          throw new ValidationError(`Cannot create reservation: ${result.errors.join(', ')}`);
        }

        if (!result.reservation) {
          throw new ValidationError('Failed to create reservation');
        }

        reservation = result.reservation;
      } else {
        // For transactions, we create the reservation directly
        // (domain service is appointment-focused, but we can extend or create directly)
        if (availableStock < input.quantity && !canOverride) {
          throw new ConflictError(
            `Insufficient stock. Available: ${availableStock}, Required: ${input.quantity}. Manager override required.`,
          );
        }

        reservation = new InventoryReservation(
          this.generateId(),
          input.productId,
          input.quantity,
          input.reservedForId,
          input.expiresAt,
          new Date(),
        );
      }

      // 11. Persist reservation
      const savedReservation = await this.inventoryReservationRepository.save(reservation);

      // 12. Create audit log entry
      await this.createAuditLog(savedReservation, input.performedBy);

      // 13. Return success result
      return {
        success: true,
        reservation: this.mapToOutput(savedReservation, input.reservedForType),
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
      throw new ForbiddenError(
        'Only Staff, Manager, or Owner role can create inventory reservations',
      );
    }
  }

  /**
   * Validates required fields
   */
  private validateRequiredFields(input: CreateInventoryReservationInput): void {
    if (!input.productId || input.productId.trim().length === 0) {
      throw new ValidationError('Product ID is required');
    }

    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new ValidationError('Quantity must be a positive integer');
    }

    if (!input.reservedForId || input.reservedForId.trim().length === 0) {
      throw new ValidationError('Reserved for ID is required');
    }

    if (input.reservedForType !== 'appointment' && input.reservedForType !== 'transaction') {
      throw new ValidationError('Reserved for type must be "appointment" or "transaction"');
    }
  }

  /**
   * Validates and loads product
   */
  private async validateAndLoadProduct(productId: string): Promise<Product> {
    const product = await this.productRepository.findById(productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return product;
  }

  /**
   * Validates and loads target (appointment or transaction)
   */
  private async validateAndLoadTarget(
    targetId: string,
    targetType: 'appointment' | 'transaction',
  ): Promise<Appointment | Transaction> {
    if (targetType === 'appointment') {
      const appointment = await this.appointmentRepository.findById(targetId);
      if (!appointment) {
        throw new NotFoundError('Target appointment not found');
      }
      return appointment;
    } else {
      const transaction = await this.transactionRepository.findById(targetId);
      if (!transaction) {
        throw new NotFoundError('Target transaction not found');
      }
      return transaction;
    }
  }

  /**
   * Gets current stock for product
   * Note: If location-specific stock is needed, this should be enhanced to accept locationId
   */
  private async getCurrentStock(productId: string): Promise<number> {
    // Get stock aggregated across all locations (or at default location)
    // In a multi-store system, you might want to add storeId/locationId to the input
    return await this.productRepository.getOnHand(productId);
  }

  /**
   * Gets active reservations for product
   */
  private async getActiveReservations(productId: string): Promise<InventoryReservation[]> {
    const allReservations = await this.inventoryReservationRepository.findByProduct(productId);
    const now = new Date();
    return allReservations.filter((reservation) => reservation.isActive(now));
  }

  /**
   * Checks if user can override insufficient stock (Manager or Owner)
   */
  private async canUserOverride(userId: string): Promise<boolean> {
    const user = await this.currentUserRepository.findById(userId);
    if (!user) {
      return false;
    }

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
   * Creates audit log entry for reservation creation
   */
  private async createAuditLog(
    reservation: InventoryReservation,
    performedBy: string,
  ): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'InventoryReservation',
        reservation.id,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            id: reservation.id,
            productId: reservation.productId,
            quantity: reservation.quantity,
            reservedFor: reservation.reservedFor,
            expiresAt: reservation.expiresAt,
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
   * Maps to output model
   */
  private mapToOutput(
    reservation: InventoryReservation,
    reservedForType: 'appointment' | 'transaction',
  ): CreateInventoryReservationOutput {
    return {
      id: reservation.id,
      productId: reservation.productId,
      quantity: reservation.quantity,
      reservedForId: reservation.reservedFor,
      reservedForType,
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): CreateInventoryReservationResult {
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
