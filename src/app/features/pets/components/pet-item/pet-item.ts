import { Component, Input } from '@angular/core';
import { IPet } from 'app/features/customers/model/customer';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-pet-item',
  imports: [CardModule],
  templateUrl: './pet-item.html',
  styleUrl: './pet-item.scss',
})
export class PetItem {
  @Input() data?: IPet;
}
