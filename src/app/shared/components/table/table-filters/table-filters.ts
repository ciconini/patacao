import { Component, Input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

@Component({
  selector: 'app-table-filters',
  imports: [ButtonModule, InputTextModule, IconFieldModule, InputIconModule],
  templateUrl: './table-filters.html',
  styleUrl: './table-filters.scss',
})
export class TableFilters {
  @Input() noSearch: boolean = false;

}
