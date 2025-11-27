import { Component } from '@angular/core';
import { Calendar } from "app/shared/components/calendar/calendar";
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-calendar-detail-page',
  imports: [Calendar,CardModule],
  templateUrl: './calendar-detail-page.html',
  styleUrl: './calendar-detail-page.scss',
})
export class CalendarDetailPage {

}
