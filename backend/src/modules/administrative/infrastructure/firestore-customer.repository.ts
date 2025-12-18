/**
 * CustomerRepository Firestore Implementation
 *
 * Firestore adapter for CustomerRepository port.
 * This implementation handles persistence of Customer domain entities to Firestore.
 *
 * Responsibilities:
 * - Map Customer domain entities to Firestore documents
 * - Map Firestore documents to Customer domain entities
 * - Implement repository interface methods
 * - Handle Firestore-specific operations (queries, transactions, search)
 *
 * This belongs to the Infrastructure/Adapters layer.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { Customer, Address } from '../domain/customer.entity';
import {
  CustomerRepository,
  CustomerSearchCriteria,
  Pagination,
  Sort,
  PaginatedResult,
} from '../ports/customer.repository.port';

/**
 * Firestore document structure for Customer
 */
interface CustomerDocument {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country?: string;
  };
  consentMarketing: boolean;
  consentReminders: boolean;
  archived: boolean; // Soft delete flag
  archivedAt?: FirebaseFirestore.Timestamp;
  archivedBy?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestoreCustomerRepository implements CustomerRepository {
  private readonly collectionName = 'customers';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore,
  ) {}

  /**
   * Saves a Customer entity to Firestore
   * Creates a new document if it doesn't exist, updates if it does.
   * Preserves archived flag if it exists.
   *
   * @param customer - Customer domain entity to save
   * @returns Saved Customer entity
   */
  async save(customer: Customer): Promise<Customer> {
    const docRef = this.firestore.collection(this.collectionName).doc(customer.id);
    const document = this.toDocument(customer);

    // Check if document exists to preserve archived flag
    const existingDoc = await docRef.get();
    if (existingDoc.exists) {
      const existingData = existingDoc.data() as CustomerDocument;
      // Preserve archived fields if they exist
      await docRef.set(
        {
          ...document,
          archived: existingData.archived || false,
          archivedAt: existingData.archivedAt,
          archivedBy: existingData.archivedBy,
        },
        { merge: true },
      );
    } else {
      // New document - set archived to false by default
      await docRef.set(
        {
          ...document,
          archived: false,
        },
        { merge: true },
      );
    }

    return customer;
  }

  /**
   * Updates a Customer entity in Firestore
   *
   * @param customer - Customer domain entity to update
   * @returns Updated Customer entity
   */
  async update(customer: Customer): Promise<Customer> {
    return this.save(customer); // Firestore set with merge handles both create and update
  }

  /**
   * Finds a Customer by ID
   *
   * @param id - Customer ID
   * @returns Customer entity or null if not found
   */
  async findById(id: string): Promise<Customer | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return this.toEntity(doc.id, doc.data() as CustomerDocument);
  }

  /**
   * Finds a Customer by email
   *
   * @param email - Email address to search for
   * @returns Customer entity or null if not found
   */
  async findByEmail(email: string): Promise<Customer | null> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('email', '==', email.trim().toLowerCase())
      .where('archived', '==', false)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return this.toEntity(doc.id, doc.data() as CustomerDocument);
  }

  /**
   * Deletes a Customer (hard delete)
   *
   * @param id - Customer ID to delete
   */
  async delete(id: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    await docRef.delete();
  }

  /**
   * Checks if a Customer is archived
   *
   * @param id - Customer ID
   * @returns True if customer is archived
   */
  async isArchived(id: string): Promise<boolean> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return false;
    }

    const data = doc.data() as CustomerDocument;
    return data.archived === true;
  }

  /**
   * Searches for customers with pagination
   *
   * @param criteria - Search criteria
   * @param pagination - Pagination parameters
   * @param sort - Sort parameters
   * @returns Paginated result of customers
   */
  async search(
    criteria: CustomerSearchCriteria,
    pagination: Pagination,
    sort: Sort,
  ): Promise<PaginatedResult<Customer>> {
    let query: FirebaseFirestore.Query = this.firestore.collection(this.collectionName);

    // Apply filters
    if (criteria.archived !== undefined) {
      query = query.where('archived', '==', criteria.archived);
    } else {
      // Default: exclude archived customers
      query = query.where('archived', '==', false);
    }

    if (criteria.email) {
      query = query.where('email', '==', criteria.email.trim().toLowerCase());
    }

    if (criteria.phone) {
      query = query.where('phone', '==', criteria.phone.trim());
    }

    if (criteria.consentMarketing !== undefined) {
      query = query.where('consentMarketing', '==', criteria.consentMarketing);
    }

    if (criteria.consentReminders !== undefined) {
      query = query.where('consentReminders', '==', criteria.consentReminders);
    }

    // Get total count (before pagination)
    const countSnapshot = await query.get();
    const total = countSnapshot.size;

    // Apply sorting
    const sortField = sort.field || 'createdAt';
    const sortDirection = sort.direction === 'desc' ? 'desc' : 'asc';
    query = query.orderBy(sortField, sortDirection);

    // Apply pagination
    const offset = (pagination.page - 1) * pagination.perPage;
    query = query.limit(pagination.perPage).offset(offset);

    // Execute query
    const snapshot = await query.get();

    // Convert to entities
    const items = snapshot.docs.map((doc) => {
      return this.toEntity(doc.id, doc.data() as CustomerDocument);
    });

    // Filter by fullName or general query if provided (client-side filtering for text search)
    // Note: Firestore doesn't support full-text search natively, so we filter in memory
    // For production, consider using Algolia, Elasticsearch, or Firestore extensions
    let filteredItems = items;
    if (criteria.q || criteria.fullName) {
      const searchTerm = (criteria.q || criteria.fullName || '').toLowerCase();
      filteredItems = items.filter((customer) => {
        return (
          customer.fullName.toLowerCase().includes(searchTerm) ||
          (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
          (customer.phone && customer.phone.includes(searchTerm))
        );
      });
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / pagination.perPage);
    const hasNext = pagination.page < totalPages;
    const hasPrevious = pagination.page > 1;

    return {
      items: filteredItems,
      meta: {
        total,
        page: pagination.page,
        perPage: pagination.perPage,
        totalPages,
        hasNext,
        hasPrevious,
      },
    };
  }

  /**
   * Converts Customer domain entity to Firestore document
   * Note: Archived flag is managed separately via update operations
   *
   * @param customer - Customer domain entity
   * @returns Firestore document (without archived fields, which are managed separately)
   */
  private toDocument(
    customer: Customer,
  ): Omit<CustomerDocument, 'archived' | 'archivedAt' | 'archivedBy'> {
    return {
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email?.toLowerCase(),
      phone: customer.phone,
      address: customer.address
        ? {
            street: customer.address.street,
            city: customer.address.city,
            postalCode: customer.address.postalCode,
            country: customer.address.country,
          }
        : undefined,
      consentMarketing: customer.consentMarketing,
      consentReminders: customer.consentReminders,
      createdAt: this.toTimestamp(customer.createdAt),
      updatedAt: this.toTimestamp(customer.updatedAt),
    };
  }

  /**
   * Marks a customer as archived
   *
   * @param id - Customer ID
   * @param archivedBy - User ID who archived the customer
   */
  async markAsArchived(id: string, archivedBy: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    await docRef.update({
      archived: true,
      archivedAt: this.toTimestamp(new Date()),
      archivedBy,
    });
  }

  /**
   * Marks a customer as not archived (unarchive)
   *
   * @param id - Customer ID
   */
  async markAsNotArchived(id: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    await docRef.update({
      archived: false,
      archivedAt: null,
      archivedBy: null,
    });
  }

  /**
   * Converts Firestore document to Customer domain entity
   * Note: Archived flag is stored in Firestore but not in domain entity
   *
   * @param id - Document ID
   * @param doc - Firestore document data
   * @returns Customer domain entity
   */
  private toEntity(id: string, doc: CustomerDocument): Customer {
    const address: Address | undefined = doc.address
      ? {
          street: doc.address.street,
          city: doc.address.city,
          postalCode: doc.address.postalCode,
          country: doc.address.country,
        }
      : undefined;

    return new Customer(
      id,
      doc.fullName,
      doc.email,
      doc.phone,
      address,
      doc.consentMarketing,
      doc.consentReminders,
      this.toDate(doc.createdAt),
      this.toDate(doc.updatedAt),
    );
  }

  /**
   * Converts JavaScript Date to Firestore Timestamp
   *
   * @param date - JavaScript Date
   * @returns Firestore Timestamp
   */
  private toTimestamp(date: Date): FirebaseFirestore.Timestamp {
    return FirebaseFirestore.Timestamp.fromDate(date);
  }

  /**
   * Converts Firestore Timestamp to JavaScript Date
   *
   * @param timestamp - Firestore Timestamp
   * @returns JavaScript Date
   */
  private toDate(timestamp: FirebaseFirestore.Timestamp): Date {
    return timestamp.toDate();
  }
}
