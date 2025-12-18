/**
 * Company Types
 * 
 * Type definitions for Company entities and API DTOs
 */

import { Address } from './customer.types';

export interface CreateCompanyRequest {
  name: string;
  nif: string;
  address: Address;
  taxRegime: string;
  defaultVatRate?: number;
  phone?: string;
  email?: string;
  website?: string;
}

export interface UpdateCompanyRequest {
  name?: string;
  nif?: string;
  address?: Address;
  taxRegime?: string;
  defaultVatRate?: number;
  phone?: string;
  email?: string;
  website?: string;
}

export interface Company {
  id: string;
  name: string;
  nif: string;
  address: Address;
  taxRegime: string;
  defaultVatRate?: number;
  phone?: string;
  email?: string;
  website?: string;
  createdAt: string;
  updatedAt?: string;
}

