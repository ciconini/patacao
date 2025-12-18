/**
 * Customer Types
 * 
 * Type definitions for Customer entities and API DTOs
 */

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country?: string;
}

export interface CreateCustomerRequest {
  fullName: string;
  email?: string;
  phone?: string;
  address?: Address;
  consentMarketing?: boolean;
  consentReminders?: boolean;
}

export interface UpdateCustomerRequest {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: Address;
  consentMarketing?: boolean;
  consentReminders?: boolean;
}

export interface Customer {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  address?: Address;
  consentMarketing: boolean;
  consentReminders: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SearchCustomersParams {
  q?: string;
  email?: string;
  phone?: string;
  fullName?: string;
  consentMarketing?: boolean;
  consentReminders?: boolean;
  archived?: boolean;
  page?: number;
  perPage?: number;
  sort?: string;
}

export interface ArchiveCustomerRequest {
  reason?: string;
}

