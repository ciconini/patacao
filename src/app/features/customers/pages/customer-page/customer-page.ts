import { Component } from '@angular/core';
import { ITableHeader, Table } from "app/shared/components/table/table";
import { CardModule } from 'primeng/card';
import { ICustomer } from '../../model/customer';


@Component({
  selector: 'app-customer-page',
  imports: [Table, CardModule],
  templateUrl: './customer-page.html',
  styleUrl: './customer-page.scss',
})
export class CustomerPage {
  tableHeaders: ITableHeader[] = [
    { header: 'Name', field: 'name' },
    { header: 'Email', field: 'email' },
  ];

  customerData: ICustomer[] = 
    [
      {
        id: 'c1',
        name: 'María Silva',
        phone: '+55 11 91234-5678',
        email: 'maria.silva@example.com',
        address: 'Rua das Flores, 123, São Paulo, SP, Brazil'
      },
      {
        id: 'c2',
        name: 'Lucas Oliveira',
        phone: '+55 21 99876-5432',
        email: 'lucas.oliveira@example.com',
        address: 'Av. Atlântica, 456, Rio de Janeiro, RJ, Brazil'
      },
      {
        id: 'c3',
        name: 'Ana Pereira',
        phone: '+55 31 98765-4321',
        email: 'ana.pereira@example.com',
        address: 'Praça Sete, 789, Belo Horizonte, MG, Brazil'
      },
      {
        id: 'c4',
        name: 'Roberto Costa',
        phone: '+55 41 99123-4567',
        email: 'roberto.costa@example.com',
        address: 'Alameda Santos, 101, Curitiba, PR, Brazil'
      },
      {
        id: 'c5',
        name: 'Sofia Ramos',
        phone: '+55 51 99321-6540',
        email: 'sofia.ramos@example.com',
        address: 'Rua dos Andradas, 202, Porto Alegre, RS, Brazil'
      },
      {
        id: 'c6',
        name: 'Pedro Gomes',
        phone: '+55 61 99222-3344',
        email: 'pedro.gomes@example.com',
        address: 'Setor Comercial Norte, Bloco A, Brasília, DF, Brazil'
      }
    ]
}