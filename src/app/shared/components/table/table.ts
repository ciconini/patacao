import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PaginatorModule } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { TableFilters } from "./table-filters/table-filters";

@Component({
  selector: 'app-table',
  imports: [TableModule, CommonModule, PaginatorModule, TableFilters],
  templateUrl: './table.html',
  styleUrl: './table.scss',
})
export class Table {
  @Input() noSearch: boolean = false;
  @Input() data: any[] = [];
  @Input() columns: ITableHeader[] = [];
}

export interface ITableHeader {
  header: string;
  field: string;
}