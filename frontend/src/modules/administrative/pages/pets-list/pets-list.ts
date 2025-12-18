/**
 * Pets List Component
 * 
 * Displays a list of pets with search, filters, and pagination
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PetApiService } from '../../api/pet.api.service';
import { CustomerApiService } from '../../api/customer.api.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ButtonComponent } from '../../../../shared/components/atoms/button/button.component';
import { InputComponent } from '../../../../shared/components/atoms/input/input.component';
import { Pet, SearchPetsParams } from '../../types/pet.types';
import { Customer } from '../../types/customer.types';
import { PaginatedResponse } from '../../../../shared/types/api.types';
import { formatDate } from '../../../../shared/utils/date.utils';

@Component({
  selector: 'app-pets-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonComponent, InputComponent],
  templateUrl: './pets-list.html',
  styleUrl: './pets-list.scss'
})
export class PetsListComponent implements OnInit {
  private readonly petApi = inject(PetApiService);
  private readonly customerApi = inject(CustomerApiService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  pets = signal<Pet[]>([]);
  customers = signal<Customer[]>([]);
  loading = signal(false);
  searchQuery = signal('');
  selectedCustomerId = signal<string>('');
  selectedSpecies = signal<string>('');
  currentPage = signal(1);
  pageSize = signal(20);
  totalItems = signal(0);
  totalPages = signal(0);

  readonly formatDate = formatDate;
  readonly speciesOptions = [
    { value: 'dog', label: 'Cão' },
    { value: 'cat', label: 'Gato' },
    { value: 'bird', label: 'Pássaro' },
    { value: 'rabbit', label: 'Coelho' },
    { value: 'hamster', label: 'Hamster' },
    { value: 'other', label: 'Outro' }
  ];

  ngOnInit(): void {
    this.loadCustomers();
    this.loadPets();
  }

  loadCustomers(): void {
    this.customerApi.search({ perPage: 100 }).subscribe({
      next: (response) => {
        this.customers.set(response.items);
      }
    });
  }

  loadPets(): void {
    this.loading.set(true);

    const params: SearchPetsParams = {
      q: this.searchQuery() || undefined,
      customerId: this.selectedCustomerId() || undefined,
      species: this.selectedSpecies() || undefined,
      page: this.currentPage(),
      perPage: this.pageSize(),
      sort: '-createdAt'
    };

    this.petApi.search(params).subscribe({
      next: (response: PaginatedResponse<Pet>) => {
        this.pets.set(response.items);
        this.totalItems.set(response.meta.total);
        this.totalPages.set(response.meta.totalPages);
        this.currentPage.set(response.meta.page);
        this.loading.set(false);
        
        // Show info message if backend endpoint is not implemented
        if (response.items.length === 0 && response.meta.total === 0) {
          // Only show once, not on every load
          if (this.currentPage() === 1) {
            this.toastService.info('Funcionalidade de busca de pets ainda não está disponível no backend');
          }
        }
      },
      error: (error) => {
        // Check if it's a 404 (endpoint not found)
        if (error?.status === 404 || error?.error?.statusCode === 404) {
          this.pets.set([]);
          this.totalItems.set(0);
          this.totalPages.set(0);
          this.toastService.warn('Endpoint de busca de pets não está disponível no backend ainda');
        } else {
          this.toastService.error('Erro ao carregar pets');
        }
        this.loading.set(false);
        console.error('Error loading pets:', error);
      }
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadPets();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadPets();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadPets();
  }

  onCreate(): void {
    // TODO: Navigate to pet detail page when created
    this.toastService.info('Funcionalidade de criação será implementada em breve');
    // this.router.navigate(['/admin/pets/new']);
  }

  onView(id: string): void {
    // TODO: Navigate to pet detail page when created
    this.toastService.info('Funcionalidade de visualização será implementada em breve');
    // this.router.navigate(['/admin/pets', id]);
  }

  onEdit(id: string): void {
    // TODO: Navigate to pet edit page when created
    this.toastService.info('Funcionalidade de edição será implementada em breve');
    // this.router.navigate(['/admin/pets', id, 'edit']);
  }

  onDelete(id: string): void {
    if (!confirm('Tem certeza que deseja excluir este pet?')) {
      return;
    }

    this.petApi.delete(id).subscribe({
      next: () => {
        this.toastService.success('Pet excluído com sucesso');
        this.loadPets();
      },
      error: (error) => {
        this.toastService.error('Erro ao excluir pet');
        console.error('Error deleting pet:', error);
      }
    });
  }

  getCustomerName(customerId: string): string {
    const customer = this.customers().find(c => c.id === customerId);
    return customer?.fullName || 'N/A';
  }

  getSpeciesLabel(species?: string): string {
    if (!species) return '-';
    const option = this.speciesOptions.find(opt => opt.value === species);
    return option?.label || species;
  }

  get pages(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    
    // Show up to 5 pages around current page
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }
}
