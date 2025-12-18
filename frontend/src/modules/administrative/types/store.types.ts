/**
 * Store Types
 * 
 * Type definitions for Store entities and API DTOs
 */

import { Address } from './customer.types';

export interface DayOpeningHours {
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface WeeklyOpeningHours {
  monday?: DayOpeningHours;
  tuesday?: DayOpeningHours;
  wednesday?: DayOpeningHours;
  thursday?: DayOpeningHours;
  friday?: DayOpeningHours;
  saturday?: DayOpeningHours;
  sunday?: DayOpeningHours;
}

export interface CreateStoreRequest {
  companyId: string;
  name: string;
  address?: Address;
  email?: string;
  phone?: string;
  openingHours: WeeklyOpeningHours;
  timezone?: string;
}

export interface UpdateStoreRequest {
  name?: string;
  address?: Address;
  email?: string;
  phone?: string;
  openingHours?: WeeklyOpeningHours;
  timezone?: string;
}

export interface Store {
  id: string;
  companyId: string;
  name: string;
  address?: Address;
  email?: string;
  phone?: string;
  openingHours: WeeklyOpeningHours;
  timezone: string;
  createdAt: string;
  updatedAt?: string;
}

