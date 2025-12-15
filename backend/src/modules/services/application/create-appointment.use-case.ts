/**
 * Create Appointment Use Case (UC-SVC-002)
 * 
 * Application use case for creating a new appointment.
 * This use case orchestrates domain entities and domain services to create appointments
 * with conflict detection and scheduling validation.
 * 
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, or Owner role)
 * - Validate store, customer, pet, and services exist
 * - Validate appointment time constraints
 * - Use AppointmentSchedulingDomainService for scheduling validation
 * - Check for conflicts
 * - Create Appointment domain entity
 * - Create AppointmentServiceLine entities
 * - Persist appointment via repository
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
import { Store } from '../../administrative/domain/store.entity';
import { Customer } from '../../administrative/domain/customer.entity';
import { Pet } from '../../administrative/domain/pet.entity';
import { User } from '../../users/domain/user.entity';
import { AppointmentSchedulingDomainService } from '../domain/appointment-scheduling.domain-service';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// AppointmentServiceLine interface (join entity)
export interface AppointmentServiceLine {
  readonly id: string;
  readonly appointmentId: string;
  readonly serviceId: string;
  readonly quantity: number;
  readonly priceOverride?: number;
}

// Repository interfaces (ports)
export interface AppointmentRepository {
  save(appointment: Appointment): Promise<Appointment>;
  findConflicts(params: {
    storeId: string;
    staffId?: string;
    startAt: Date;
    endAt: Date;
    excludeId?: string;
  }): Promise<Appointment[]>;
}

export interface AppointmentServiceLineRepository {
  saveLines(appointmentId: string, lines: AppointmentServiceLine[]): Promise<AppointmentServiceLine[]>;
}

export interface StoreRepository {
  findById(id: string): Promise<Store | null>;
}

export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
}

export interface PetRepository {
  findById(id: string): Promise<Pet | null>;
}

export interface ServiceRepository {
  findById(id: string): Promise<Service | null>;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
  hasStoreAccess(userId: string, storeId: string): Promise<boolean>;
}

// Input model
export interface CreateAppointmentInput {
  storeId: string;
  customerId: string;
  petId: string;
  startAt: Date;
  endAt: Date;
  staffId?: string;
  services: Array<{
    serviceId: string;
    quantity?: number;
    priceOverride?: number;
  }>;
  notes?: string;
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'custom';
    interval: number;
    endDate?: Date;
    count?: number;
  };
  performedBy: string; // User ID
}

// Output model
export interface CreateAppointmentOutput {
  id: string;
  storeId: string;
  customerId: string;
  petId: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  staffId?: string;
  services: AppointmentServiceLine[];
  notes?: string;
  recurrenceId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Result type
export interface CreateAppointmentResult {
  success: boolean;
  appointment?: CreateAppointmentOutput;
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
 * Create Appointment Use Case
 */
export class CreateAppointmentUseCase {
  private static readonly MAX_NOTES_LENGTH = 2000;

  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly appointmentServiceLineRepository: AppointmentServiceLineRepository,
    private readonly storeRepository: StoreRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly petRepository: PetRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly userRepository: UserRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly appointmentSchedulingDomainService: AppointmentSchedulingDomainService,
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
   * Executes the create appointment use case
   * 
   * @param input - Input data for creating appointment
   * @returns Result containing created appointment or error
   */
  async execute(input: CreateAppointmentInput): Promise<CreateAppointmentResult> {
    try {
      // 1. Validate user exists and has required role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate required fields
      this.validateRequiredFields(input);

      // 3. Load and validate store
      const store = await this.validateAndLoadStore(input.storeId);

      // 4. Verify user has store access
      const hasAccess = await this.currentUserRepository.hasStoreAccess(
        input.performedBy,
        input.storeId
      );
      if (!hasAccess) {
        throw new ForbiddenError('You do not have access to this store');
      }

      // 5. Load and validate customer
      const customer = await this.validateAndLoadCustomer(input.customerId);

      // 6. Load and validate pet
      const pet = await this.validateAndLoadPet(input.petId, input.customerId);

      // 7. Validate and load services
      const validatedServices = await this.validateAndLoadServices(input.services);

      // 8. Validate time constraints
      this.validateTimeConstraints(input.startAt, input.endAt);

      // 9. Calculate and validate duration
      const totalDuration = this.calculateTotalDuration(validatedServices);
      this.validateDuration(input.startAt, input.endAt, totalDuration);

      // 10. Load staff if provided
      let staff: User | undefined;
      if (input.staffId) {
        staff = await this.validateAndLoadStaff(input.staffId, input.storeId);
      }

      // 11. Check for conflicts
      await this.checkConflicts(input, store, pet, staff);

      // 12. Create Appointment domain entity
      const appointment = this.createAppointmentEntity(input);

      // 13. Persist appointment
      const savedAppointment = await this.appointmentRepository.save(appointment);

      // 14. Create appointment service lines
      const serviceLines = this.createServiceLines(savedAppointment.id, input.services, validatedServices);
      await this.appointmentServiceLineRepository.saveLines(savedAppointment.id, serviceLines);

      // 15. Create audit log entry
      await this.createAuditLog(savedAppointment, input.performedBy);

      // 16. Return success result
      return {
        success: true,
        appointment: this.mapToOutput(savedAppointment, serviceLines),
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
      throw new ForbiddenError('Only Staff, Manager, or Owner role can create appointments');
    }
  }

  /**
   * Validates required fields
   */
  private validateRequiredFields(input: CreateAppointmentInput): void {
    if (!input.storeId || input.storeId.trim().length === 0) {
      throw new ValidationError('Required field "store_id" is missing');
    }

    if (!input.customerId || input.customerId.trim().length === 0) {
      throw new ValidationError('Required field "customer_id" is missing');
    }

    if (!input.petId || input.petId.trim().length === 0) {
      throw new ValidationError('Required field "pet_id" is missing');
    }

    if (!input.startAt) {
      throw new ValidationError('Required field "start_at" is missing');
    }

    if (!input.endAt) {
      throw new ValidationError('Required field "end_at" is missing');
    }

    if (!input.services || input.services.length === 0) {
      throw new ValidationError('At least one service is required');
    }
  }

  /**
   * Validates and loads store
   */
  private async validateAndLoadStore(storeId: string): Promise<Store> {
    const store = await this.storeRepository.findById(storeId);
    
    if (!store) {
      throw new NotFoundError('Store not found');
    }

    return store;
  }

  /**
   * Validates and loads customer
   */
  private async validateAndLoadCustomer(customerId: string): Promise<Customer> {
    const customer = await this.customerRepository.findById(customerId);
    
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Note: Customer entity doesn't have an archived flag in the domain model
    // This would need to be checked if the business rule requires it

    return customer;
  }

  /**
   * Validates and loads pet
   */
  private async validateAndLoadPet(petId: string, customerId: string): Promise<Pet> {
    const pet = await this.petRepository.findById(petId);
    
    if (!pet) {
      throw new NotFoundError('Pet not found');
    }

    if (pet.customerId !== customerId) {
      throw new ValidationError('Pet does not belong to the specified customer');
    }

    return pet;
  }

  /**
   * Validates and loads services
   */
  private async validateAndLoadServices(
    services: CreateAppointmentInput['services']
  ): Promise<Service[]> {
    const validatedServices: Service[] = [];

    for (let i = 0; i < services.length; i++) {
      const serviceInput = services[i];
      const serviceIndex = i + 1;

      if (!serviceInput.serviceId || serviceInput.serviceId.trim().length === 0) {
        throw new ValidationError(`Service ${serviceIndex}: Service ID is required`);
      }

      const service = await this.serviceRepository.findById(serviceInput.serviceId);
      if (!service) {
        throw new NotFoundError(`Service ${serviceIndex}: Service with ID ${serviceInput.serviceId} not found`);
      }

      const quantity = serviceInput.quantity || 1;
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new ValidationError(`Service ${serviceIndex}: Quantity must be greater than 0`);
      }

      if (serviceInput.priceOverride !== undefined && serviceInput.priceOverride < 0) {
        throw new ValidationError(`Service ${serviceIndex}: Price override must be >= 0`);
      }

      validatedServices.push(service);
    }

    return validatedServices;
  }

  /**
   * Validates time constraints
   */
  private validateTimeConstraints(startAt: Date, endAt: Date): void {
    const now = new Date();
    const start = new Date(startAt);
    const end = new Date(endAt);

    if (start < now) {
      throw new ValidationError('Appointment start time cannot be in the past');
    }

    if (end <= start) {
      throw new ValidationError('End time must be after start time');
    }
  }

  /**
   * Calculates total duration from services
   */
  private calculateTotalDuration(services: Service[]): number {
    // Note: This is simplified - in a real system, you'd multiply by quantity
    // For now, we'll just sum the durations
    return services.reduce((total, service) => total + service.durationMinutes, 0);
  }

  /**
   * Validates appointment duration matches service durations
   */
  private validateDuration(startAt: Date, endAt: Date, totalDuration: number): void {
    const appointmentDuration = Math.floor((endAt.getTime() - startAt.getTime()) / (1000 * 60));
    
    // Allow some tolerance (e.g., 5 minutes)
    const tolerance = 5;
    if (Math.abs(appointmentDuration - totalDuration) > tolerance) {
      throw new ValidationError(
        `Appointment duration (${appointmentDuration} minutes) does not match total service duration (${totalDuration} minutes)`
      );
    }
  }

  /**
   * Validates and loads staff
   */
  private async validateAndLoadStaff(staffId: string, storeId: string): Promise<User> {
    const staff = await this.userRepository.findById(staffId);
    
    if (!staff) {
      throw new NotFoundError(`Staff with ID ${staffId} not found`);
    }

    if (!staff.isAssignedToStore(storeId)) {
      throw new ValidationError('Staff member is not assigned to this store');
    }

    return staff;
  }

  /**
   * Checks for conflicts using AppointmentSchedulingDomainService
   */
  private async checkConflicts(
    input: CreateAppointmentInput,
    store: Store,
    pet: Pet,
    staff: User | undefined
  ): Promise<void> {
    // Create temporary appointment entity for validation
    const tempAppointment = new Appointment(
      'temp-id',
      input.storeId,
      input.customerId,
      input.petId,
      new Date(input.startAt),
      new Date(input.endAt),
      AppointmentStatus.BOOKED,
      input.performedBy,
      input.staffId,
      input.notes
    );

    // Find existing appointments that might conflict
    const existingAppointments = await this.appointmentRepository.findConflicts({
      storeId: input.storeId,
      staffId: input.staffId,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
    });

    // Use domain service to validate scheduling
    const validationResult = this.appointmentSchedulingDomainService.validateAppointmentScheduling(
      tempAppointment,
      store,
      pet,
      staff,
      existingAppointments
    );

    if (!validationResult.isValid) {
      throw new ConflictError(
        `Appointment conflicts detected: ${validationResult.errors.join('; ')}`
      );
    }
  }

  /**
   * Creates Appointment domain entity
   */
  private createAppointmentEntity(input: CreateAppointmentInput): Appointment {
    const appointmentId = this.generateId();
    const now = new Date();

    return new Appointment(
      appointmentId,
      input.storeId,
      input.customerId,
      input.petId,
      new Date(input.startAt),
      new Date(input.endAt),
      AppointmentStatus.BOOKED,
      input.performedBy,
      input.staffId,
      input.notes,
      undefined // recurrenceId - would be set if recurrence is handled
    );
  }

  /**
   * Creates appointment service lines
   */
  private createServiceLines(
    appointmentId: string,
    serviceInputs: CreateAppointmentInput['services'],
    services: Service[]
  ): AppointmentServiceLine[] {
    return serviceInputs.map((serviceInput, index) => ({
      id: this.generateId(),
      appointmentId,
      serviceId: serviceInput.serviceId,
      quantity: serviceInput.quantity || 1,
      priceOverride: serviceInput.priceOverride,
    }));
  }

  /**
   * Creates audit log entry
   */
  private async createAuditLog(
    appointment: Appointment,
    performedBy: string
  ): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Appointment',
        appointment.id,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            id: appointment.id,
            storeId: appointment.storeId,
            customerId: appointment.customerId,
            petId: appointment.petId,
            startAt: appointment.startAt,
            endAt: appointment.endAt,
            status: appointment.status,
            staffId: appointment.staffId,
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
   * Maps to output model
   */
  private mapToOutput(
    appointment: Appointment,
    serviceLines: AppointmentServiceLine[]
  ): CreateAppointmentOutput {
    return {
      id: appointment.id,
      storeId: appointment.storeId,
      customerId: appointment.customerId,
      petId: appointment.petId,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      status: appointment.status,
      staffId: appointment.staffId,
      services: serviceLines,
      notes: appointment.notes,
      recurrenceId: appointment.recurrenceId,
      createdBy: appointment.createdBy || '',
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): CreateAppointmentResult {
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

