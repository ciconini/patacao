/**
 * Stores List Component
 * 
 * Displays a list of stores with actions
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { StoreApiService } from '../../api/store.api.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ButtonComponent } from '../../../../shared/components/atoms/button/button.component';
import { Store } from '../../types/store.types';
import { formatDate } from '../../../../shared/utils/date.utils';

@Component({
  selector: 'app-stores-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: './stores-list.html',
  styleUrl: './stores-list.scss'
})
export class StoresListComponent implements OnInit {
  private readonly storeApi = inject(StoreApiService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  stores = signal<Store[]>([]);
  loading = signal(false);

  readonly formatDate = formatDate;

  ngOnInit(): void {
    this.loadStores();
  }

  loadStores(): void {
    this.loading.set(true);

    this.storeApi.getAll().subscribe({
      next: (response) => {
        this.stores.set(response.items);
        this.loading.set(false);
        
        if (response.items.length === 0) {
          this.toastService.info('Funcionalidade de listagem de lojas ainda não está disponível no backend');
        }
      },
      error: (error) => {
        this.toastService.error('Erro ao carregar lojas');
        this.loading.set(false);
        console.error('Error loading stores:', error);
      }
    });
  }

  onCreate(): void {
    this.router.navigate(['/admin/stores/new']);
  }

  onView(id: string): void {
    this.router.navigate(['/admin/stores', id]);
  }

  onEdit(id: string): void {
    this.router.navigate(['/admin/stores', id, 'edit']);
  }

  onDelete(id: string): void {
    if (!confirm('Tem certeza que deseja excluir esta loja?')) {
      return;
    }

    this.storeApi.delete(id).subscribe({
      next: () => {
        this.toastService.success('Loja excluída com sucesso');
        this.loadStores();
      },
      error: (error) => {
        this.toastService.error('Erro ao excluir loja');
        console.error('Error deleting store:', error);
      }
    });
  }

  formatOpeningHours(openingHours: Store['openingHours']): string {
    if (!openingHours) return '-';
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    
    const hours = days.map((day, index) => {
      const dayHours = openingHours[day as keyof typeof openingHours];
      if (!dayHours || dayHours.closed) {
        return `${dayLabels[index]}: Fechado`;
      }
      return `${dayLabels[index]}: ${dayHours.open} - ${dayHours.close}`;
    });
    
    return hours.join(', ');
  }
}
