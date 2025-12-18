/**
 * Pet Types
 * 
 * Type definitions for Pet entities and API DTOs
 */

export interface Vaccination {
  vaccine: string;
  date: string;
  expires?: string;
  administeredBy?: string;
}

export interface CreatePetRequest {
  customerId: string;
  name: string;
  species?: string;
  breed?: string;
  dateOfBirth?: string;
  microchipId?: string;
  medicalNotes?: string;
  vaccination?: Vaccination[];
}

export interface UpdatePetRequest {
  name?: string;
  species?: string;
  breed?: string;
  dateOfBirth?: string;
  microchipId?: string;
  medicalNotes?: string;
  vaccination?: Vaccination[];
}

export interface Pet {
  id: string;
  customerId: string;
  name: string;
  species?: string;
  breed?: string;
  dateOfBirth?: string;
  age?: number;
  microchipId?: string;
  medicalNotes?: string;
  vaccination?: Vaccination[];
  createdAt: string;
  updatedAt?: string;
}

export interface SearchPetsParams {
  q?: string;
  customerId?: string;
  species?: string;
  name?: string;
  microchipId?: string;
  page?: number;
  perPage?: number;
  sort?: string;
}

