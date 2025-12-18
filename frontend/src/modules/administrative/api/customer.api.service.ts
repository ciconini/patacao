/**
 * Customer API Service
 * 
 * API service for customer management endpoints
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../shared/services/api.service';
import { PaginatedResponse } from '../../../shared/types/api.types';
import {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  SearchCustomersParams,
  ArchiveCustomerRequest
} from '../types/customer.types';

@Injectable({
  providedIn: 'root'
})
export class CustomerApiService {
  private readonly apiService = inject(ApiService);

  /**
   * Search customers with filters and pagination
   */
  search(params: SearchCustomersParams = {}): Observable<PaginatedResponse<Customer>> {
    // Backend returns paginated response directly (not wrapped)
    return this.apiService.get<PaginatedResponse<Customer>>('/customers/search', params);
  }

  /**
   * Get customer by ID
   */
  getById(id: string): Observable<Customer> {
    return this.apiService.get<Customer>(`/customers/${id}`);
  }

  /**
   * Create a new customer
   */
  create(data: CreateCustomerRequest): Observable<Customer> {
    return this.apiService.post<Customer>('/customers', data);
  }

  /**
   * Update an existing customer
   */
  update(id: string, data: UpdateCustomerRequest): Observable<Customer> {
    return this.apiService.put<Customer>(`/customers/${id}`, data);
  }

  /**
   * Archive a customer (soft delete)
   */
  archive(id: string, data?: ArchiveCustomerRequest): Observable<void> {
    return this.apiService.post<void>(`/customers/${id}/archive`, data || {});
  }
}

