/**
 * Authentication Module
 * 
 * NestJS module that provides authentication services and guards.
 * This module integrates Firebase Authentication with the backend.
 */

import { Module, Global } from '@nestjs/common';
import { DatabaseModule } from '../../adapters/db/database.module';
import { FirebaseAuthService } from './firebase-auth.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';

@Global()
@Module({
  imports: [DatabaseModule], // Import to get FIREBASE_ADMIN
  providers: [
    FirebaseAuthService,
    FirebaseAuthGuard,
    {
      provide: 'FirebaseAuthService',
      useExisting: FirebaseAuthService,
    },
  ],
  exports: [FirebaseAuthService, FirebaseAuthGuard],
})
export class AuthModule {}

