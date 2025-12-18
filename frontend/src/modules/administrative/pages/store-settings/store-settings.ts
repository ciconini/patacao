/**
 * Store Settings Component
 * 
 * View and edit store information including opening hours
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { StoreApiService } from '../../api/store.api.service';
import { CompanyApiService } from '../../api/company.api.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { FormFieldComponent } from '../../../../shared/components/molecules/form-field/form-field.component';
import { ButtonComponent } from '../../../../shared/components/atoms/button/button.component';
import { Store, UpdateStoreRequest, WeeklyOpeningHours, DayOpeningHours } from '../../types/store.types';
import { Company } from '../../types/company.types';
import { emailValidator, phoneValidator } from '../../../../shared/utils/validators';
import { formatDate } from '../../../../shared/utils/date.utils';

@Component({
  selector: 'app-store-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent, ButtonComponent],
  templateUrl: './store-settings.html',
  styleUrl: './store-settings.scss'
})
export class StoreSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly storeApi = inject(StoreApiService);
  private readonly companyApi = inject(CompanyApiService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  store = signal<Store | null>(null);
  company = signal<Company | null>(null);
  loading = signal(false);
  saving = signal(false);
  storeForm!: FormGroup;
  editMode = signal(false);

  readonly formatDate = formatDate;
  readonly daysOfWeek = [
    { key: 'monday', label: 'Segunda-feira' },
    { key: 'tuesday', label: 'Terça-feira' },
    { key: 'wednesday', label: 'Quarta-feira' },
    { key: 'thursday', label: 'Quinta-feira' },
    { key: 'friday', label: 'Sexta-feira' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ];
  readonly timezoneOptions = [
    { value: 'Europe/Lisbon', label: 'Europe/Lisbon (Portugal)' },
    { value: 'Europe/Porto', label: 'Europe/Porto (Portugal)' }
  ];

  ngOnInit(): void {
    this.buildForm();
    const storeId = this.route.snapshot.paramMap.get('id');
    if (storeId) {
      this.loadStore(storeId);
    } else {
      this.toastService.warn('ID da loja não fornecido');
    }
  }

  private buildForm(): void {
    this.storeForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      address: this.fb.group({
        street: ['', [Validators.maxLength(255)]],
        city: ['', [Validators.maxLength(255)]],
        postalCode: ['', [this.postalCodeValidator()]],
        country: ['Portugal']
      }),
      phone: ['', [phoneValidator()]],
      email: ['', [emailValidator()]],
      timezone: ['Europe/Lisbon', [Validators.required]],
      openingHours: this.fb.group({
        monday: this.createDayFormGroup(),
        tuesday: this.createDayFormGroup(),
        wednesday: this.createDayFormGroup(),
        thursday: this.createDayFormGroup(),
        friday: this.createDayFormGroup(),
        saturday: this.createDayFormGroup(),
        sunday: this.createDayFormGroup()
      })
    });
  }

  private createDayFormGroup(): FormGroup {
    return this.fb.group({
      closed: [false],
      open: [''],
      close: ['']
    });
  }

  private loadStore(id: string): void {
    this.loading.set(true);

    this.storeApi.getById(id).subscribe({
      next: (store) => {
        this.store.set(store);
        this.populateForm(store);
        this.loadCompany(store.companyId);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        if (error?.status === 404 || error?.error?.statusCode === 404) {
          this.toastService.warn('Endpoint GET de loja não está disponível no backend ainda');
        } else {
          this.toastService.error('Erro ao carregar loja');
        }
        console.error('Error loading store:', error);
      }
    });
  }

  private loadCompany(companyId: string): void {
    this.companyApi.getById(companyId).subscribe({
      next: (company) => {
        this.company.set(company);
      },
      error: () => {
        // Company load is optional, don't show error
      }
    });
  }

  private populateForm(store: Store): void {
    this.storeForm.patchValue({
      name: store.name,
      address: store.address ? {
        street: store.address.street || '',
        city: store.address.city || '',
        postalCode: store.address.postalCode || '',
        country: store.address.country || 'Portugal'
      } : {
        street: '',
        city: '',
        postalCode: '',
        country: 'Portugal'
      },
      phone: store.phone || '',
      email: store.email || '',
      timezone: store.timezone || 'Europe/Lisbon'
    });

    // Populate opening hours
    const openingHoursGroup = this.storeForm.get('openingHours') as FormGroup;
    this.daysOfWeek.forEach(day => {
      const dayHours = store.openingHours[day.key as keyof typeof store.openingHours];
      if (dayHours) {
        openingHoursGroup.get(day.key)?.patchValue({
          closed: dayHours.closed || false,
          open: dayHours.open || '',
          close: dayHours.close || ''
        });
      }
    });
  }

  toggleEditMode(): void {
    if (this.editMode()) {
      // Cancel edit - reload data
      const store = this.store();
      if (store) {
        this.loadStore(store.id);
      }
    }
    this.editMode.update(v => !v);
  }

  onSubmit(): void {
    if (this.storeForm.invalid) {
      this.markFormGroupTouched(this.storeForm);
      return;
    }

    const store = this.store();
    if (!store) {
      this.toastService.error('Loja não encontrada');
      return;
    }

    this.saving.set(true);

    const formValue = this.storeForm.value;
    
    // Build opening hours
    const openingHours: WeeklyOpeningHours = {};
    this.daysOfWeek.forEach(day => {
      const dayValue = formValue.openingHours[day.key];
      if (dayValue.closed) {
        openingHours[day.key as keyof WeeklyOpeningHours] = { closed: true };
      } else if (dayValue.open && dayValue.close) {
        openingHours[day.key as keyof WeeklyOpeningHours] = {
          open: dayValue.open,
          close: dayValue.close,
          closed: false
        };
      }
    });

    // Build address if at least one field is filled
    let address;
    if (formValue.address.street || formValue.address.city || formValue.address.postalCode) {
      address = {
        street: formValue.address.street,
        city: formValue.address.city,
        postalCode: formValue.address.postalCode,
        country: formValue.address.country || 'Portugal'
      };
    }

    const data: UpdateStoreRequest = {
      name: formValue.name,
      address: address,
      phone: formValue.phone || undefined,
      email: formValue.email || undefined,
      timezone: formValue.timezone,
      openingHours: openingHours
    };

    this.storeApi.update(store.id, data).subscribe({
      next: (updatedStore) => {
        this.store.set(updatedStore);
        this.populateForm(updatedStore);
        this.editMode.set(false);
        this.saving.set(false);
        this.toastService.success('Loja atualizada com sucesso');
      },
      error: (error) => {
        this.saving.set(false);
        this.toastService.error('Erro ao atualizar loja');
        console.error('Error updating store:', error);
      }
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

  private postalCodeValidator() {
    return (control: any): { [key: string]: any } | null => {
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

  get nameError(): string | null {
    const control = this.storeForm?.get('name');
    if (control?.hasError('required') && control.touched) {
      return 'Nome é obrigatório';
    }
    return null;
  }
}
