import { Routes } from "@angular/router";
import { CustomerPage } from "./pages/customer-page/customer-page";
import { CustomerDetailPage } from "./pages/customer-detail-page/customer-detail-page";

export const CustomersRoutes: Routes = [
  {
    path: '',
    component: CustomerPage,
  },
  {
    path: ':id',
    component: CustomerDetailPage,
  }
];
