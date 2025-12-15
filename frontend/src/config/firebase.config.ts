/**
 * Firebase Configuration
 * 
 * This file exports the Firebase configuration object for use throughout the application.
 * The configuration is imported from environment files to support different environments
 * (development, production, etc.).
 * 
 * Usage:
 * ```typescript
 * import { firebaseConfig } from '@config/firebase.config';
 * import { initializeApp } from '@angular/fire/app';
 * 
 * const app = initializeApp(firebaseConfig);
 * ```
 */

import { environment } from '../environments/environment';

export const firebaseConfig = environment.firebase;

