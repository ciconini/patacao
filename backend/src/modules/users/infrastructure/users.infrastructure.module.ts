/**
 * Users Infrastructure Module
 *
 * NestJS module that provides Firestore implementations for Users module repositories.
 * This module registers all repository adapters and exports them for use in other modules.
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../adapters/db/database.module';
import { FirestoreUserRepository } from './firestore-user.repository';
import { FirestoreSessionRepository } from './firestore-session.repository';
import { FirestorePasswordResetTokenRepository } from './firestore-password-reset-token.repository';
import { FirestoreRoleRepository } from './firestore-role.repository';
import { CurrentUserRepositoryAdapter } from './current-user.repository.adapter';
import { UserRepository } from '../ports/user.repository.port';
import { SessionRepository } from '../ports/session.repository.port';
import { PasswordResetTokenRepository } from '../ports/password-reset-token.repository.port';
import { RoleRepository } from '../ports/role.repository.port';
import { CurrentUserRepository } from './current-user.repository.adapter';

@Module({
  imports: [DatabaseModule], // Import DatabaseModule to get FIRESTORE provider
  providers: [
    {
      provide: 'UserRepository',
      useClass: FirestoreUserRepository,
    },
    {
      provide: 'SessionRepository',
      useClass: FirestoreSessionRepository,
    },
    {
      provide: 'PasswordResetTokenRepository',
      useClass: FirestorePasswordResetTokenRepository,
    },
    {
      provide: 'RoleRepository',
      useClass: FirestoreRoleRepository,
    },
    {
      provide: 'CurrentUserRepository',
      useClass: CurrentUserRepositoryAdapter,
    },
  ],
  exports: [
    'UserRepository',
    'SessionRepository',
    'PasswordResetTokenRepository',
    'RoleRepository',
    'CurrentUserRepository',
  ],
})
export class UsersInfrastructureModule {}
