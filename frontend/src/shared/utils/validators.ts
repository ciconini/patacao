/**
 * Custom Validators
 * 
 * Reusable form validators
 */

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validate Portuguese NIF (Número de Identificação Fiscal)
 */
export function nifValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Don't validate empty values (use required validator)
    }

    const nif = control.value.toString().replace(/\s/g, '');
    
    // NIF must be 9 digits
    if (!/^\d{9}$/.test(nif)) {
      return { nif: { message: 'NIF deve ter 9 dígitos' } };
    }

    // NIF validation algorithm (simplified)
    const digits = nif.split('').map(Number);
    let sum = 0;
    
    for (let i = 0; i < 8; i++) {
      sum += digits[i] * (9 - i);
    }
    
    const checkDigit = 11 - (sum % 11);
    const finalCheck = checkDigit >= 10 ? 0 : checkDigit;
    
    if (finalCheck !== digits[8]) {
      return { nif: { message: 'NIF inválido' } };
    }

    return null;
  };
}

/**
 * Validate email format
 */
export function emailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(control.value)) {
      return { email: { message: 'Email inválido' } };
    }

    return null;
  };
}

/**
 * Validate phone number (Portuguese format)
 */
export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    // Portuguese phone: +351XXXXXXXXX or 9XXXXXXXX
    const phoneRegex = /^(\+351)?[2-9]\d{8}$/;
    const cleaned = control.value.replace(/\s|-/g, '');
    
    if (!phoneRegex.test(cleaned)) {
      return { phone: { message: 'Número de telefone inválido' } };
    }

    return null;
  };
}

/**
 * Validate URL format
 */
export function urlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    try {
      const url = new URL(control.value);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { url: { message: 'URL deve começar com http:// ou https://' } };
      }
      return null;
    } catch {
      return { url: { message: 'URL inválida' } };
    }
  };
}

/**
 * Validate password strength
 */
export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const value = control.value;
    const errors: string[] = [];

    if (value.length < 8) {
      errors.push('pelo menos 8 caracteres');
    }
    if (!/[A-Z]/.test(value)) {
      errors.push('uma letra maiúscula');
    }
    if (!/[a-z]/.test(value)) {
      errors.push('uma letra minúscula');
    }
    if (!/\d/.test(value)) {
      errors.push('um número');
    }

    if (errors.length > 0) {
      return { passwordStrength: { message: `A senha deve conter: ${errors.join(', ')}` } };
    }

    return null;
  };
}

