/**
 * Search Appointments Use Case (UC-SVC-006)
 * 
 * Application use case for searching and filtering appointment records.
 * This use case orchestrates domain entities and repository ports to search appointments.
 * 
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, Veterinarian, or Owner role)
 * - Validate search criteria and pagination parameters
 * - Execute search via repository
 * - Enrich results with denormalized data
 * - Return paginated results with metadata
 * 
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Appointment, AppointmentStatus } from '../domain/appointment.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface AppointmentRepository {
  search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<Appointment>>;
}

export interface StoreRepository {
  findById(id: string): Promise<{ id: string; name: string } | null>;
}

export interface CustomerRepository {
  findById(id: string): Promise<{ id: string; fullName: string } | null>;
}

export interface PetRepository {
  findById(id: string): Promise<{ id: string; name: string } | null>;
}

export interface UserRepository {
  findById(id: string): Promise<{ id: string; fullName: string } | null>;
}

export interface ServiceRepository {
  findById(id: string): Promise<{ id: string; name: string } | null>;
}

export interface AppointmentServiceLineRepository {
  findByAppointmentId(appointmentId: string): Promise<Array<{
    serviceId: string;
    quantity: number;
  }>>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Search criteria model
export interface SearchCriteria {
  storeId?: string;
  staffId?: string;
  customerId?: string;
  petId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: AppointmentStatus;
}

// Pagination model
export interface Pagination {
  page: number;
  perPage: number;
}

// Sort model
export interface Sort {
  field: string;
  direction: 'asc' | 'desc';
}

// Paginated result model
export interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Input model
export interface SearchAppointmentsInput {
  storeId?: string;
  staffId?: string;
  customerId?: string;
  petId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  page?: number;
  perPage?: number;
  sort?: string; // e.g., "start_at", "-start_at", "created_at", "-created_at"
  performedByUser: string; // User ID performing the search
}

// Output model
export interface SearchAppointmentsOutput {
  items: Array<{
    id: string;
    storeId: string;
    storeName: string;
    customerId: string;
    customerName: string;
    petId: string;
    petName: string;
    startAt: Date;
    endAt: Date;
    status: AppointmentStatus;
    staffId?: string;
    staffName?: string;
    services: Array<{
      serviceId: string;
      serviceName: string;
      quantity: number;
    }>;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Result type
export interface SearchAppointmentsResult {
  success: boolean;
  data?: SearchAppointmentsOutput;
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

/**
 * Search Appointments Use Case
 */
export class SearchAppointmentsUseCase {
  private static readonly MIN_PAGE = 1;
  private static readonly MIN_PER_PAGE = 1;
  private static readonly MAX_PER_PAGE = 100;
  private static readonly DEFAULT_PER_PAGE = 20;
  private static readonly DEFAULT_SORT = 'start_at';
  private static readonly VALID_SORT_FIELDS = ['start_at', 'created_at'];
  private static readonly VALID_STATUSES = [
    AppointmentStatus.BOOKED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CHECKED_IN,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NEEDS_RESCHEDULE,
  ];

  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly storeRepository: StoreRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly petRepository: PetRepository,
    private readonly userRepository: UserRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly appointmentServiceLineRepository: AppointmentServiceLineRepository,
    private readonly currentUserRepository: CurrentUserRepository
  ) {}

  /**
   * Executes the search appointments use case
   * 
   * @param input - Input data for searching appointments
   * @returns Result containing paginated appointment list or error
   */
  async execute(input: SearchAppointmentsInput): Promise<SearchAppointmentsResult> {
    try {
      // 1. Validate user exists and has required role
      await this.validateUserAuthorization(input.performedByUser);

      // 2. Validate and normalize pagination parameters
      const pagination = this.validateAndNormalizePagination(input.page, input.perPage);

      // 3. Validate and normalize sort parameter
      const sort = this.validateAndNormalizeSort(input.sort);

      // 4. Validate date range
      this.validateDateRange(input.startDate, input.endDate);

      // 5. Validate status if provided
      const status = this.validateStatus(input.status);

      // 6. Build search criteria
      const criteria = this.buildSearchCriteria(input, status);

      // 7. Execute search via repository
      const result = await this.appointmentRepository.search(criteria, pagination, sort);

      // 8. Enrich results with denormalized data
      const enrichedItems = await this.enrichWithDenormalizedData(result.items);

      // 9. Return success result
      return {
        success: true,
        data: {
          items: enrichedItems,
          meta: result.meta,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization (must have Staff, Manager, Veterinarian, or Owner role)
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
        return role.isStaff() || role.isManager() || role.isVeterinarian() || role.isOwner();
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError('Only Staff, Manager, Veterinarian, or Owner role can search appointments');
    }
  }

  /**
   * Validates and normalizes pagination parameters
   */
  private validateAndNormalizePagination(page?: number, perPage?: number): Pagination {
    const normalizedPage = page !== undefined && page >= SearchAppointmentsUseCase.MIN_PAGE
      ? page
      : SearchAppointmentsUseCase.MIN_PAGE;

    const normalizedPerPage = perPage !== undefined &&
      perPage >= SearchAppointmentsUseCase.MIN_PER_PAGE &&
      perPage <= SearchAppointmentsUseCase.MAX_PER_PAGE
      ? perPage
      : SearchAppointmentsUseCase.DEFAULT_PER_PAGE;

    return {
      page: normalizedPage,
      perPage: normalizedPerPage,
    };
  }

  /**
   * Validates and normalizes sort parameter
   */
  private validateAndNormalizeSort(sort?: string): Sort {
    if (!sort) {
      return {
        field: SearchAppointmentsUseCase.DEFAULT_SORT,
        direction: 'asc', // Default: earliest first
      };
    }

    const isDescending = sort.startsWith('-');
    const field = isDescending ? sort.substring(1) : sort;

    if (!SearchAppointmentsUseCase.VALID_SORT_FIELDS.includes(field)) {
      throw new ValidationError(
        `Invalid sort field. Valid fields: ${SearchAppointmentsUseCase.VALID_SORT_FIELDS.join(', ')}`
      );
    }

    return {
      field,
      direction: isDescending ? 'desc' : 'asc',
    };
  }

  /**
   * Validates date range
   */
  private validateDateRange(startDate?: Date, endDate?: Date): void {
    if (startDate && endDate && startDate > endDate) {
      throw new ValidationError('Start date must be before or equal to end date');
    }
  }

  /**
   * Validates status if provided
   */
  private validateStatus(status?: string): AppointmentStatus | undefined {
    if (!status) {
      return undefined;
    }

    const validStatus = SearchAppointmentsUseCase.VALID_STATUSES.find(
      s => s === status
    );

    if (!validStatus) {
      throw new ValidationError(
        `Invalid status. Valid values: ${SearchAppointmentsUseCase.VALID_STATUSES.join(', ')}`
      );
    }

    return validStatus;
  }

  /**
   * Builds search criteria from input
   */
  private buildSearchCriteria(
    input: SearchAppointmentsInput,
    status?: AppointmentStatus
  ): SearchCriteria {
    const criteria: SearchCriteria = {};

    if (input.storeId) {
      criteria.storeId = input.storeId;
    }

    if (input.staffId) {
      criteria.staffId = input.staffId;
    }

    if (input.customerId) {
      criteria.customerId = input.customerId;
    }

    if (input.petId) {
      criteria.petId = input.petId;
    }

    if (input.startDate) {
      criteria.startDate = new Date(input.startDate);
    }

    if (input.endDate) {
      criteria.endDate = new Date(input.endDate);
    }

    if (status) {
      criteria.status = status;
    }

    return criteria;
  }

  /**
   * Enriches appointments with denormalized data
   */
  private async enrichWithDenormalizedData(
    appointments: Appointment[]
  ): Promise<SearchAppointmentsOutput['items']> {
    const enrichedItems: SearchAppointmentsOutput['items'] = [];

    // Collect unique IDs for batch loading
    const storeIds = new Set<string>();
    const customerIds = new Set<string>();
    const petIds = new Set<string>();
    const userIds = new Set<string>();
    const appointmentIds = appointments.map(a => a.id);

    for (const appointment of appointments) {
      storeIds.add(appointment.storeId);
      customerIds.add(appointment.customerId);
      petIds.add(appointment.petId);
      if (appointment.staffId) {
        userIds.add(appointment.staffId);
      }
    }

    // Load all related entities in parallel
    const [stores, customers, pets, users] = await Promise.all([
      this.loadStores(Array.from(storeIds)),
      this.loadCustomers(Array.from(customerIds)),
      this.loadPets(Array.from(petIds)),
      this.loadUsers(Array.from(userIds)),
    ]);

    // Load service lines for all appointments
    const serviceLinesMap = new Map<string, Array<{ serviceId: string; quantity: number }>>();
    await Promise.all(
      appointmentIds.map(async (appointmentId) => {
        const lines = await this.appointmentServiceLineRepository.findByAppointmentId(appointmentId);
        serviceLinesMap.set(appointmentId, lines);
      })
    );

    // Load services
    const serviceIds = new Set<string>();
    for (const lines of serviceLinesMap.values()) {
      for (const line of lines) {
        serviceIds.add(line.serviceId);
      }
    }
    const services = await this.loadServices(Array.from(serviceIds));

    // Enrich each appointment
    for (const appointment of appointments) {
      const store = stores.get(appointment.storeId);
      const customer = customers.get(appointment.customerId);
      const pet = pets.get(appointment.petId);
      const staff = appointment.staffId ? users.get(appointment.staffId) : undefined;
      const serviceLines = serviceLinesMap.get(appointment.id) || [];

      const enrichedServices = serviceLines.map(line => {
        const service = services.get(line.serviceId);
        return {
          serviceId: line.serviceId,
          serviceName: service?.name || 'Unknown Service',
          quantity: line.quantity,
        };
      });

      enrichedItems.push({
        id: appointment.id,
        storeId: appointment.storeId,
        storeName: store?.name || 'Unknown Store',
        customerId: appointment.customerId,
        customerName: customer?.fullName || 'Unknown Customer',
        petId: appointment.petId,
        petName: pet?.name || 'Unknown Pet',
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        status: appointment.status,
        staffId: appointment.staffId,
        staffName: staff?.fullName,
        services: enrichedServices,
        notes: appointment.notes,
        createdAt: appointment.createdAt,
        updatedAt: appointment.updatedAt,
      });
    }

    return enrichedItems;
  }

  /**
   * Loads stores by IDs
   */
  private async loadStores(storeIds: string[]): Promise<Map<string, { id: string; name: string }>> {
    const stores = new Map<string, { id: string; name: string }>();

    await Promise.all(
      storeIds.map(async (id) => {
        const store = await this.storeRepository.findById(id);
        if (store) {
          stores.set(id, store);
        }
      })
    );

    return stores;
  }

  /**
   * Loads customers by IDs
   */
  private async loadCustomers(customerIds: string[]): Promise<Map<string, { id: string; fullName: string }>> {
    const customers = new Map<string, { id: string; fullName: string }>();

    await Promise.all(
      customerIds.map(async (id) => {
        const customer = await this.customerRepository.findById(id);
        if (customer) {
          customers.set(id, customer);
        }
      })
    );

    return customers;
  }

  /**
   * Loads pets by IDs
   */
  private async loadPets(petIds: string[]): Promise<Map<string, { id: string; name: string }>> {
    const pets = new Map<string, { id: string; name: string }>();

    await Promise.all(
      petIds.map(async (id) => {
        const pet = await this.petRepository.findById(id);
        if (pet) {
          pets.set(id, pet);
        }
      })
    );

    return pets;
  }

  /**
   * Loads users by IDs
   */
  private async loadUsers(userIds: string[]): Promise<Map<string, { id: string; fullName: string }>> {
    const users = new Map<string, { id: string; fullName: string }>();

    await Promise.all(
      userIds.map(async (id) => {
        const user = await this.userRepository.findById(id);
        if (user) {
          users.set(id, user);
        }
      })
    );

    return users;
  }

  /**
   * Loads services by IDs
   */
  private async loadServices(serviceIds: string[]): Promise<Map<string, { id: string; name: string }>> {
    const services = new Map<string, { id: string; name: string }>();

    await Promise.all(
      serviceIds.map(async (id) => {
        const service = await this.serviceRepository.findById(id);
        if (service) {
          services.set(id, service);
        }
      })
    );

    return services;
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): SearchAppointmentsResult {
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

