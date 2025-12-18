/**
 * Pet Form Component
 * 
 * Reusable form component for creating and editing pets
 */

import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { FormFieldComponent } from '../../../../shared/components/molecules/form-field/form-field.component';
import { ButtonComponent } from '../../../../shared/components/atoms/button/button.component';
import { Pet, CreatePetRequest, UpdatePetRequest, Vaccination } from '../../types/pet.types';
import { CustomerApiService } from '../../api/customer.api.service';
import { Customer } from '../../types/customer.types';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-pet-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent, ButtonComponent],
  templateUrl: './pet-form.html',
  styleUrl: './pet-form.scss'
})
export class PetFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly customerApi = inject(CustomerApiService);

  @Input() pet: Pet | null = null;
  @Input() customerId: string | null = null;
  @Input() loading: boolean = false;
  @Output() submit = new EventEmitter<CreatePetRequest | UpdatePetRequest>();
  @Output() cancel = new EventEmitter<void>();

  petForm!: FormGroup;
  isEditMode = false;
  customers: Customer[] = [];
  loadingCustomers = false;

  readonly speciesOptions = [
    { value: 'dog', label: 'Cão' },
    { value: 'cat', label: 'Gato' },
    { value: 'bird', label: 'Pássaro' },
    { value: 'rabbit', label: 'Coelho' },
    { value: 'hamster', label: 'Hamster' },
    { value: 'other', label: 'Outro' }
  ];

  ngOnInit(): void {
    this.isEditMode = !!this.pet;
    this.buildForm();
    this.loadCustomers();
    
    if (this.pet) {
      this.populateForm(this.pet);
    } else if (this.customerId) {
      this.petForm.patchValue({ customerId: this.customerId });
    }
  }

  private buildForm(): void {
    this.petForm = this.fb.group({
      customerId: [this.customerId || '', [Validators.required]],
      name: ['', [Validators.required, Validators.maxLength(255)]],
      species: ['', [Validators.maxLength(64)]],
      breed: ['', [Validators.maxLength(128)]],
      dateOfBirth: [''],
      microchipId: ['', [Validators.maxLength(64)]],
      medicalNotes: ['', [Validators.maxLength(5000)]],
      vaccination: this.fb.array([])
    });
  }

  private populateForm(pet: Pet): void {
    this.petForm.patchValue({
      customerId: pet.customerId,
      name: pet.name,
      species: pet.species || '',
      breed: pet.breed || '',
      dateOfBirth: pet.dateOfBirth || '',
      microchipId: pet.microchipId || '',
      medicalNotes: pet.medicalNotes || ''
    });

    // Populate vaccinations
    const vaccinationArray = this.petForm.get('vaccination') as FormArray;
    vaccinationArray.clear();
    if (pet.vaccination && pet.vaccination.length > 0) {
      pet.vaccination.forEach(vacc => {
        vaccinationArray.push(this.createVaccinationFormGroup(vacc));
      });
    }
  }

  private loadCustomers(): void {
    this.loadingCustomers = true;
    this.customerApi.search({ perPage: 100 }).subscribe({
      next: (response) => {
        this.customers = response.items;
        this.loadingCustomers = false;
      },
      error: () => {
        this.loadingCustomers = false;
      }
    });
  }

  get vaccinationFormArray(): FormArray {
    return this.petForm.get('vaccination') as FormArray;
  }

  createVaccinationFormGroup(vaccination?: Vaccination): FormGroup {
    return this.fb.group({
      vaccine: [vaccination?.vaccine || '', [Validators.required, Validators.maxLength(255)]],
      date: [vaccination?.date || '', [Validators.required]],
      expires: [vaccination?.expires || ''],
      administeredBy: [vaccination?.administeredBy || '', [Validators.maxLength(255)]]
    });
  }

  addVaccination(): void {
    const vaccinationArray = this.petForm.get('vaccination') as FormArray;
    vaccinationArray.push(this.createVaccinationFormGroup());
  }

  removeVaccination(index: number): void {
    const vaccinationArray = this.petForm.get('vaccination') as FormArray;
    vaccinationArray.removeAt(index);
  }

  onSubmit(): void {
    if (this.petForm.invalid) {
      this.markFormGroupTouched(this.petForm);
      return;
    }

    const formValue = this.petForm.value;
    
    const data: CreatePetRequest | UpdatePetRequest = {
      customerId: formValue.customerId,
      name: formValue.name,
      species: formValue.species || undefined,
      breed: formValue.breed || undefined,
      dateOfBirth: formValue.dateOfBirth || undefined,
      microchipId: formValue.microchipId || undefined,
      medicalNotes: formValue.medicalNotes || undefined,
      vaccination: formValue.vaccination && formValue.vaccination.length > 0
        ? formValue.vaccination.map((v: any) => ({
            vaccine: v.vaccine,
            date: v.date,
            expires: v.expires || undefined,
            administeredBy: v.administeredBy || undefined
          }))
        : undefined
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
      } else if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          }
        });
      }
    });
  }

  // Error getters
  get customerIdError(): string | null {
    const control = this.petForm?.get('customerId');
    if (control?.hasError('required') && control.touched) {
      return 'Cliente é obrigatório';
    }
    return null;
  }

  get nameError(): string | null {
    const control = this.petForm?.get('name');
    if (control?.hasError('required') && control.touched) {
      return 'Nome é obrigatório';
    }
    if (control?.hasError('maxlength') && control.touched) {
      return 'Nome deve ter no máximo 255 caracteres';
    }
    return null;
  }
}
