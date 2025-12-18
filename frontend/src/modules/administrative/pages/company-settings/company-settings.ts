/**
 * Company Settings Component
 * 
 * View and edit company profile information
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { CompanyApiService } from '../../api/company.api.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { FormFieldComponent } from '../../../../shared/components/molecules/form-field/form-field.component';
import { ButtonComponent } from '../../../../shared/components/atoms/button/button.component';
import { Company, UpdateCompanyRequest } from '../../types/company.types';
import { nifValidator, emailValidator, phoneValidator, urlValidator } from '../../../../shared/utils/validators';
import { formatDate } from '../../../../shared/utils/date.utils';

@Component({
  selector: 'app-company-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent, ButtonComponent],
  templateUrl: './company-settings.html',
  styleUrl: './company-settings.scss'
})
export class CompanySettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly companyApi = inject(CompanyApiService);
  private readonly toastService = inject(ToastService);

  company = signal<Company | null>(null);
  loading = signal(false);
  saving = signal(false);
  companyForm!: FormGroup;
  editMode = signal(false);

  readonly formatDate = formatDate;
  readonly taxRegimeOptions = [
    { value: 'Simplificado', label: 'Simplificado' },
    { value: 'Normal', label: 'Normal' }
  ];

  ngOnInit(): void {
    this.buildForm();
    // TODO: Get company ID from user context or route params
    // For now, we'll need to handle this when the backend provides a way to get current company
    this.loadCompany();
  }

  private buildForm(): void {
    this.companyForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      nif: ['', [Validators.required, nifValidator()]],
      address: this.fb.group({
        street: ['', [Validators.required, Validators.maxLength(255)]],
        city: ['', [Validators.required, Validators.maxLength(255)]],
        postalCode: ['', [Validators.required, this.postalCodeValidator()]],
        country: ['Portugal']
      }),
      taxRegime: ['', [Validators.required]],
      defaultVatRate: ['', [this.vatRateValidator()]],
      phone: ['', [phoneValidator()]],
      email: ['', [emailValidator()]],
      website: ['', [urlValidator()]]
    });
  }

  private loadCompany(): void {
    // TODO: Get company ID from user context or route
    // For now, show message that this needs to be implemented
    this.toastService.info('Funcionalidade de carregamento de empresa será implementada quando o backend fornecer o endpoint GET');
  }

  toggleEditMode(): void {
    if (this.editMode()) {
      // Cancel edit - reload data
      this.loadCompany();
    }
    this.editMode.update(v => !v);
  }

  onSubmit(): void {
    if (this.companyForm.invalid) {
      this.markFormGroupTouched(this.companyForm);
      return;
    }

    const company = this.company();
    if (!company) {
      this.toastService.error('Empresa não encontrada');
      return;
    }

    this.saving.set(true);

    const formValue = this.companyForm.value;
    const data: UpdateCompanyRequest = {
      name: formValue.name,
      nif: formValue.nif,
      address: {
        street: formValue.address.street,
        city: formValue.address.city,
        postalCode: formValue.address.postalCode,
        country: formValue.address.country || 'Portugal'
      },
      taxRegime: formValue.taxRegime,
      defaultVatRate: formValue.defaultVatRate ? parseFloat(formValue.defaultVatRate) : undefined,
      phone: formValue.phone || undefined,
      email: formValue.email || undefined,
      website: formValue.website || undefined
    };

    this.companyApi.update(company.id, data).subscribe({
      next: (updatedCompany) => {
        this.company.set(updatedCompany);
        this.populateForm(updatedCompany);
        this.editMode.set(false);
        this.saving.set(false);
        this.toastService.success('Empresa atualizada com sucesso');
      },
      error: (error) => {
        this.saving.set(false);
        this.toastService.error('Erro ao atualizar empresa');
        console.error('Error updating company:', error);
      }
    });
  }

  private populateForm(company: Company): void {
    this.companyForm.patchValue({
      name: company.name,
      nif: company.nif,
      address: {
        street: company.address.street,
        city: company.address.city,
        postalCode: company.address.postalCode,
        country: company.address.country || 'Portugal'
      },
      taxRegime: company.taxRegime,
      defaultVatRate: company.defaultVatRate?.toString() || '',
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || ''
    });
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
        return null;
      }
      const postalCodeRegex = /^\d{4}-\d{3}$/;
      if (!postalCodeRegex.test(control.value)) {
        return { postalCode: { value: control.value } };
      }
      return null;
    };
  }

  private vatRateValidator() {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) {
        return null;
      }
      const rate = parseFloat(control.value);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return { vatRate: { value: control.value } };
      }
      return null;
    };
  }

  // Error getters
  get nameError(): string | null {
    const control = this.companyForm?.get('name');
    if (control?.hasError('required') && control.touched) {
      return 'Nome é obrigatório';
    }
    return null;
  }

  get nifError(): string | null {
    const control = this.companyForm?.get('nif');
    if (control?.hasError('required') && control.touched) {
      return 'NIF é obrigatório';
    }
    if (control?.hasError('nif') && control.touched) {
      return control.getError('nif')?.message || 'NIF inválido';
    }
    return null;
  }

  get postalCodeError(): string | null {
    const control = this.companyForm?.get('address.postalCode');
    if (control?.hasError('required') && control.touched) {
      return 'Código postal é obrigatório';
    }
    if (control?.hasError('postalCode') && control.touched) {
      return 'Código postal inválido (formato: NNNN-NNN)';
    }
    return null;
  }

  get vatRateError(): string | null {
    const control = this.companyForm?.get('defaultVatRate');
    if (control?.hasError('vatRate') && control.touched) {
      return 'Taxa de IVA deve estar entre 0 e 100';
    }
    return null;
  }
}
