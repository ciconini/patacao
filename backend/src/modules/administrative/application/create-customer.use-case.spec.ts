/**
 * Unit Tests for CreateCustomerUseCase
 * 
 * Example unit test demonstrating the testing pattern for use cases.
 * This test mocks all dependencies (repositories, services) to test
 * the use case logic in isolation.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CreateCustomerUseCase } from './create-customer.use-case';
import { CustomerRepository } from '../ports/customer.repository.port';
import { AuditLogDomainService } from '../../../shared/domain/audit-log.domain-service';
import { ValidationError } from '../../../../shared/errors/application-error.base';
import { Customer } from '../domain/customer.entity';

describe('CreateCustomerUseCase', () => {
  let useCase: CreateCustomerUseCase;
  let mockCustomerRepository: jest.Mocked<CustomerRepository>;
  let mockAuditLogService: jest.Mocked<AuditLogDomainService>;

  beforeEach(async () => {
    // Create mocks
    mockCustomerRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    } as any;

    mockAuditLogService = {
      createAuditEntry: jest.fn(),
    } as any;

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateCustomerUseCase,
        {
          provide: 'CustomerRepository',
          useValue: mockCustomerRepository,
        },
        {
          provide: AuditLogDomainService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    useCase = module.get<CreateCustomerUseCase>(CreateCustomerUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create a customer successfully', async () => {
      // Arrange
      const input = {
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '+351912345678',
        performedBy: 'user-123',
      };

      const savedCustomer = Customer.create(
        'customer-123',
        input.fullName,
        input.email,
        input.phone,
        false,
        false,
      );

      mockCustomerRepository.save.mockResolvedValue(savedCustomer);
      mockCustomerRepository.findByEmail.mockResolvedValue(null);
      mockCustomerRepository.findByPhone.mockResolvedValue(null);
      mockAuditLogService.createAuditEntry.mockReturnValue({
        success: true,
        auditLog: {} as any,
      });

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.customer.id).toBe('customer-123');
      expect(result.customer.fullName).toBe(input.fullName);
      expect(mockCustomerRepository.save).toHaveBeenCalledTimes(1);
      expect(mockCustomerRepository.findByEmail).toHaveBeenCalledWith(input.email);
      expect(mockAuditLogService.createAuditEntry).toHaveBeenCalled();
    });

    it('should throw ValidationError if email already exists', async () => {
      // Arrange
      const input = {
        fullName: 'John Doe',
        email: 'existing@example.com',
        performedBy: 'user-123',
      };

      const existingCustomer = Customer.create(
        'existing-customer-id',
        'Existing User',
        input.email,
        undefined,
        false,
        false,
      );

      mockCustomerRepository.findByEmail.mockResolvedValue(existingCustomer);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
      expect(mockCustomerRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ValidationError if phone already exists', async () => {
      // Arrange
      const input = {
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '+351912345678',
        performedBy: 'user-123',
      };

      const existingCustomer = Customer.create(
        'existing-customer-id',
        'Existing User',
        'other@example.com',
        input.phone,
        false,
        false,
      );

      mockCustomerRepository.findByEmail.mockResolvedValue(null);
      mockCustomerRepository.findByPhone.mockResolvedValue(existingCustomer);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
      expect(mockCustomerRepository.save).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      // Arrange
      const input = {
        fullName: '', // Empty name
        performedBy: 'user-123',
      };

      // Act & Assert
      await expect(useCase.execute(input as any)).rejects.toThrow(ValidationError);
      expect(mockCustomerRepository.save).not.toHaveBeenCalled();
    });
  });
});

