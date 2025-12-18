/**
 * Company API Service
 * 
 * API service for company management endpoints
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../shared/services/api.service';
import {
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest
} from '../types/company.types';

@Injectable({
  providedIn: 'root'
})
export class CompanyApiService {
  private readonly apiService = inject(ApiService);

  /**
   * Get company by ID
   */
  getById(id: string): Observable<Company> {
    return this.apiService.get<Company>(`/companies/${id}`);
  }

  /**
   * Create a new company
   */
  create(data: CreateCompanyRequest): Observable<Company> {
    return this.apiService.post<Company>('/companies', data);
  }

  /**
   * Update an existing company
   */
  update(id: string, data: UpdateCompanyRequest): Observable<Company> {
    return this.apiService.put<Company>(`/companies/${id}`, data);
  }
}

