/**
 * Store API Service
 * 
 * API service for store management endpoints
 */

import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ApiService } from '../../../shared/services/api.service';
import { PaginatedResponse } from '../../../shared/types/api.types';
import {
  Store,
  CreateStoreRequest,
  UpdateStoreRequest
} from '../types/store.types';

@Injectable({
  providedIn: 'root'
})
export class StoreApiService {
  private readonly apiService = inject(ApiService);

  /**
   * Get all stores (with pagination)
   * NOTE: Backend list endpoint may not be implemented yet
   */
  getAll(params?: { page?: number; perPage?: number }): Observable<PaginatedResponse<Store>> {
    // TODO: Check if backend has list endpoint
    // For now, return empty result
    return of({
      items: [],
      meta: {
        page: params?.page || 1,
        perPage: params?.perPage || 20,
        total: 0,
        totalPages: 0
      }
    });
    
    // When backend endpoint is available, uncomment:
    // return this.apiService.getPaginated<Store>('/stores', params);
  }

  /**
   * Get store by ID
   */
  getById(id: string): Observable<Store> {
    return this.apiService.get<Store>(`/stores/${id}`);
  }

  /**
   * Get stores by company ID
   */
  getByCompanyId(companyId: string): Observable<Store[]> {
    // TODO: Check if backend has this endpoint
    return of([]);
    // return this.apiService.get<Store[]>(`/stores/company/${companyId}`);
  }

  /**
   * Create a new store
   */
  create(data: CreateStoreRequest): Observable<Store> {
    return this.apiService.post<Store>('/stores', data);
  }

  /**
   * Update an existing store
   */
  update(id: string, data: UpdateStoreRequest): Observable<Store> {
    return this.apiService.put<Store>(`/stores/${id}`, data);
  }

  /**
   * Delete a store
   */
  delete(id: string): Observable<void> {
    return this.apiService.delete<void>(`/stores/${id}`);
  }
}

