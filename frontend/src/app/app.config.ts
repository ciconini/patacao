import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { environment } from '../environments/environment';

import { routes } from './app.routes';
import { authReducer } from '../shared/stores/auth/auth.reducer';
import { AuthEffects } from '../shared/stores/auth/auth.effects';
import { authInterceptor } from '../shared/interceptors/auth.interceptor';
import { errorInterceptor } from '../shared/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        errorInterceptor
      ])
    ),
    provideStore({
      auth: authReducer
    }),
    provideEffects([AuthEffects]),
    ...(environment.production ? [] : [
      provideStoreDevtools({
        maxAge: 25,
        logOnly: !environment.production
      })
    ])
  ]
};
