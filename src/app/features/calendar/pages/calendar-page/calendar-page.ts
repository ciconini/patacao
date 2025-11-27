import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-calendar-page',
  imports: [CardModule],
  templateUrl: './calendar-page.html',
  styleUrl: './calendar-page.scss',
})
export class CalendarPage {
  calendars = [
    { id: '1', name: 'Work', owner: 'John Doe' },
    { id: '2', name: 'Personal', owner: 'Mary Joe' },
    { id: '3', name: 'Holidays', owner: 'Max Locke' },
  ];
}
