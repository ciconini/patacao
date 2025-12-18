import { Routes } from '@angular/router';
import { authGuard } from '../shared/guards/auth.guard';
import { roleGuard } from '../shared/guards/role.guard';
import { MainLayoutComponent } from '../shared/components/templates/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('../modules/users/presentation/pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('../modules/dashboard/presentation/pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'admin',
        canActivate: [roleGuard(['Manager', 'Owner'])],
        children: [
          {
            path: '',
            redirectTo: 'customers',
            pathMatch: 'full'
          },
          {
            path: 'customers',
            loadComponent: () => import('../modules/administrative/pages/customers-list/customers-list').then(m => m.CustomersListComponent)
          },
          {
            path: 'pets',
            loadComponent: () => import('../modules/administrative/pages/pets-list/pets-list').then(m => m.PetsListComponent)
          },
          {
            path: 'company',
            loadComponent: () => import('../modules/administrative/pages/company-settings/company-settings').then(m => m.CompanySettingsComponent)
          },
          {
            path: 'stores',
            loadComponent: () => import('../modules/administrative/pages/stores-list/stores-list').then(m => m.StoresListComponent)
          },
          {
            path: 'stores/:id',
            loadComponent: () => import('../modules/administrative/pages/store-settings/store-settings').then(m => m.StoreSettingsComponent)
          },
          {
            path: 'stores/:id/edit',
            loadComponent: () => import('../modules/administrative/pages/store-settings/store-settings').then(m => m.StoreSettingsComponent)
          }
          // TODO: Add customer detail routes when component is created
          // {
          //   path: 'customers/new',
          //   loadComponent: () => import('../modules/administrative/pages/customer-detail/customer-detail').then(m => m.CustomerDetailComponent)
          // },
          // {
          //   path: 'customers/:id',
          //   loadComponent: () => import('../modules/administrative/pages/customer-detail/customer-detail').then(m => m.CustomerDetailComponent)
          // },
          // {
          //   path: 'customers/:id/edit',
          //   loadComponent: () => import('../modules/administrative/pages/customer-detail/customer-detail').then(m => m.CustomerDetailComponent)
          // }
          // TODO: Add pet detail routes when component is created
          // {
          //   path: 'pets/new',
          //   loadComponent: () => import('../modules/administrative/pages/pet-detail/pet-detail').then(m => m.PetDetailComponent)
          // },
          // {
          //   path: 'pets/:id',
          //   loadComponent: () => import('../modules/administrative/pages/pet-detail/pet-detail').then(m => m.PetDetailComponent)
          // },
          // {
          //   path: 'pets/:id/edit',
          //   loadComponent: () => import('../modules/administrative/pages/pet-detail/pet-detail').then(m => m.PetDetailComponent)
          // }
        ]
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
