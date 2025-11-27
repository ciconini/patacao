import { CalendarDetailPage } from './pages/calendar-detail-page/calendar-detail-page';

export const CalendarRoutes = [
  {
    path: '',
    loadComponent: () => import('./pages/calendar-page/calendar-page').then(m => m.CalendarPage)
  },
  {
    path: '1',
    component: CalendarDetailPage
  }
];