import { Routes } from '@angular/router';
import { LoginPage } from './features/login/pages/login-page/login-page';
import { DashboardLayout } from './features/dashboard/layout/dashboard-layout/dashboard-layout';
import { CustomersRoutes } from './features/customers/customers.routes';
import { CalendarRoutes } from './features/calendar/calendar.routes';

export const routes: Routes = [
  {
    path: '',
    component: DashboardLayout,
  },
  {
    path: 'customers',
    component: DashboardLayout,
    children: CustomersRoutes
  },
  {
    path: 'calendar',
    component: DashboardLayout,
    children: CalendarRoutes
  },
  {
    path: 'login',
    component: LoginPage
  },
];
