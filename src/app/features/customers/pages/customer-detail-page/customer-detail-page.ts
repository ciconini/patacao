import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ICustomer } from '../../model/customer';
import { ButtonModule } from 'primeng/button';
import { PetItem } from "app/features/pets/components/pet-item/pet-item";
import { ITableHeader, Table } from "app/shared/components/table/table";

@Component({
  selector: 'app-customer-detail-page',
  imports: [CardModule, ButtonModule, PetItem, Table],
  templateUrl: './customer-detail-page.html',
  styleUrl: './customer-detail-page.scss',
})
export class CustomerDetailPage {
  mockAppointments = [
    { date: '2024-01-15', petName: 'Buddy' },
    { date: '2024-02-20', petName: 'Mittens' },
    { date: '2024-03-10', petName: 'Charlie' },
  ];
  tableHeaders: ITableHeader[] = [
    { header: 'Date', field: 'date' },
    { header: 'Pet Name', field: 'petName' },
  ];


  customer: ICustomer = { 
    id: '1', 
    name: 'John Doe', 
    phone: '910022392', 
    email: 'john.doe@example.com', 
    address: 'Example street, 123',
    pets: [
      { id: 'a1', name: 'Buddy', species: 'Dog', breed: 'Golden Retriever', age: 3, image: '' },
      { id: 'a2', name: 'Mittens', species: 'Cat', breed: 'Siamese', age: 2, image: '' }
    ]
  };

}
