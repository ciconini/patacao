/**
 * Customer Form Component
 * 
 * Reusable form component for creating and editing customers
 */

import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { FormFieldComponent } from '../../../../shared/components/molecules/form-field/form-field.component';
import { ButtonComponent } from '../../../../shared/components/atoms/button/button.component';
import { Customer, CreateCustomerRequest, UpdateCustomerRequest, Address } from '../../types/customer.types';
import { emailValidator, phoneValidator } from '../../../../shared/utils/validators';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent, ButtonComponent],
  templateUrl: './customer-form.html',
  styleUrl: './customer-form.scss'
})
export class CustomerFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  @Input() customer: Customer | null = null;
  @Input() loading: boolean = false;
  @Output() submit = new EventEmitter<CreateCustomerRequest | UpdateCustomerRequest>();
  @Output() cancel = new EventEmitter<void>();

  customerForm!: FormGroup;
  isEditMode = false;

  ngOnInit(): void {
    this.isEditMode = !!this.customer;
    this.buildForm();
    
    if (this.customer) {
      this.populateForm(this.customer);
    }
  }

  private buildForm(): void {
    this.customerForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(255)]],
      email: ['', [emailValidator()]],
      phone: ['', [phoneValidator()]],
      address: this.fb.group({
        street: ['', [Validators.maxLength(255)]],
        city: ['', [Validators.maxLength(255)]],
        postalCode: ['', [this.postalCodeValidator()]],
        country: ['Portugal']
      }),
      consentMarketing: [false],
      consentReminders: [true]
    });
  }

  private populateForm(customer: Customer): void {
    this.customerForm.patchValue({
      fullName: customer.fullName,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address ? {
        street: customer.address.street || '',
        city: customer.address.city || '',
        postalCode: customer.address.postalCode || '',
        country: customer.address.country || 'Portugal'
      } : {
        street: '',
        city: '',
        postalCode: '',
        country: 'Portugal'
      },
      consentMarketing: customer.consentMarketing,
      consentReminders: customer.consentReminders
    });
  }

  onSubmit(): void {
    if (this.customerForm.invalid) {
      this.markFormGroupTouched(this.customerForm);
      return;
    }

    const formValue = this.customerForm.value;
    
    // Build address object only if at least one field is filled
    let address: Address | undefined;
    if (formValue.address.street || formValue.address.city || formValue.address.postal_code) {
      address = {
        street: formValue.address.street,
        city: formValue.address.city,
        postalCode: formValue.address.postalCode,
        country: formValue.address.country || 'Portugal'
      };
    }

    const data: CreateCustomerRequest | UpdateCustomerRequest = {
      fullName: formValue.fullName,
      email: formValue.email || undefined,
      phone: formValue.phone || undefined,
      address: address,
      consentMarketing: formValue.consentMarketing,
      consentReminders: formValue.consentReminders
    };

    this.submit.emit(data);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Validators
  private postalCodeValidator() {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) {
        return null; // Optional field
      }
      const postalCodeRegex = /^\d{4}-\d{3}$/;
      if (!postalCodeRegex.test(control.value)) {
        return { postalCode: { value: control.value } };
      }
      return null;
    };
  }

  // Error getters
  get fullNameError(): string | null {
    const control = this.customerForm?.get('fullName');
    if (control?.hasError('required') && control.touched) {
      return 'Nome completo é obrigatório';
    }
    if (control?.hasError('maxlength') && control.touched) {
      return 'Nome completo deve ter no máximo 255 caracteres';
    }
    return null;
  }

  get emailError(): string | null {
    const control = this.customerForm?.get('email');
    if (control?.hasError('email') && control.touched) {
      return 'Email inválido';
    }
    return null;
  }

  get phoneError(): string | null {
    const control = this.customerForm?.get('phone');
    if (control?.hasError('phone') && control.touched) {
      return 'Telefone inválido';
    }
    return null;
  }

  get postalCodeError(): string | null {
    const control = this.customerForm?.get('address.postalCode');
    if (control?.hasError('postalCode') && control.touched) {
      return 'Código postal inválido (formato: NNNN-NNN)';
    }
    return null;
  }
}
