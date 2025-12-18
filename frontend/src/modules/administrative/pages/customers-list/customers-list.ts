/**
 * Customers List Component
 * 
 * Displays a list of customers with search, filters, and pagination
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CustomerApiService } from '../../api/customer.api.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ButtonComponent } from '../../../../shared/components/atoms/button/button.component';
import { InputComponent } from '../../../../shared/components/atoms/input/input.component';
import { Customer, SearchCustomersParams } from '../../types/customer.types';
import { PaginatedResponse } from '../../../../shared/types/api.types';
import { formatDate } from '../../../../shared/utils/date.utils';

@Component({
  selector: 'app-customers-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonComponent, InputComponent],
  templateUrl: './customers-list.html',
  styleUrl: './customers-list.scss'
})
export class CustomersListComponent implements OnInit {
  private readonly customerApi = inject(CustomerApiService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  customers = signal<Customer[]>([]);
  loading = signal(false);
  searchQuery = signal('');
  currentPage = signal(1);
  pageSize = signal(20);
  totalItems = signal(0);
  totalPages = signal(0);

  readonly formatDate = formatDate;

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading.set(true);

    const params: SearchCustomersParams = {
      q: this.searchQuery() || undefined,
      page: this.currentPage(),
      perPage: this.pageSize(),
      sort: '-createdAt'
    };

    this.customerApi.search(params).subscribe({
      next: (response: PaginatedResponse<Customer>) => {
        this.customers.set(response.items);
        this.totalItems.set(response.meta.total);
        this.totalPages.set(response.meta.totalPages);
        this.currentPage.set(response.meta.page);
        this.loading.set(false);
      },
      error: (error) => {
        this.toastService.error('Erro ao carregar clientes');
        this.loading.set(false);
        console.error('Error loading customers:', error);
      }
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadCustomers();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadCustomers();
  }

  onCreate(): void {
    // TODO: Navigate to customer detail page when created
    this.toastService.info('Funcionalidade de criação será implementada em breve');
    // this.router.navigate(['/admin/customers/new']);
  }

  onView(id: string): void {
    // TODO: Navigate to customer detail page when created
    this.toastService.info('Funcionalidade de visualização será implementada em breve');
    // this.router.navigate(['/admin/customers', id]);
  }

  onEdit(id: string): void {
    // TODO: Navigate to customer edit page when created
    this.toastService.info('Funcionalidade de edição será implementada em breve');
    // this.router.navigate(['/admin/customers', id, 'edit']);
  }

  onArchive(id: string): void {
    if (!confirm('Tem certeza que deseja arquivar este cliente?')) {
      return;
    }

    this.customerApi.archive(id).subscribe({
      next: () => {
        this.toastService.success('Cliente arquivado com sucesso');
        this.loadCustomers();
      },
      error: (error) => {
        this.toastService.error('Erro ao arquivar cliente');
        console.error('Error archiving customer:', error);
      }
    });
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
