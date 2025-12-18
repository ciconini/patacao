/**
 * Pet API Service
 * 
 * API service for pet management endpoints
 */

import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ApiService } from '../../../shared/services/api.service';
import { PaginatedResponse } from '../../../shared/types/api.types';
import {
  Pet,
  CreatePetRequest,
  UpdatePetRequest,
  SearchPetsParams
} from '../types/pet.types';

@Injectable({
  providedIn: 'root'
})
export class PetApiService {
  private readonly apiService = inject(ApiService);

  /**
   * Search pets with filters and pagination
   * NOTE: Backend search endpoint is not yet implemented
   * This will return an empty result until the backend endpoint is available
   */
  search(params: SearchPetsParams = {}): Observable<PaginatedResponse<Pet>> {
    // TODO: Backend search endpoint not implemented yet
    // For now, return empty result
    return of({
      items: [],
      meta: {
        page: params.page || 1,
        perPage: params.perPage || 20,
        total: 0,
        totalPages: 0
      }
    });
    
    // When backend endpoint is available, uncomment:
    // return this.apiService.get<PaginatedResponse<Pet>>('/pets/search', params);
  }

  /**
   * Get pet by ID
   */
  getById(id: string): Observable<Pet> {
    return this.apiService.get<Pet>(`/pets/${id}`);
  }

  /**
   * Get pets by customer ID
   */
  getByCustomerId(customerId: string): Observable<Pet[]> {
    return this.apiService.get<Pet[]>(`/pets/customer/${customerId}`);
  }

  /**
   * Create a new pet
   */
  create(data: CreatePetRequest): Observable<Pet> {
    return this.apiService.post<Pet>('/pets', data);
  }

  /**
   * Update an existing pet
   */
  update(id: string, data: UpdatePetRequest): Observable<Pet> {
    return this.apiService.put<Pet>(`/pets/${id}`, data);
  }

  /**
   * Delete a pet
   */
  delete(id: string): Observable<void> {
    return this.apiService.delete<void>(`/pets/${id}`);
  }
}

