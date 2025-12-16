/**
 * Users Application Module
 * 
 * NestJS module that registers all use cases for the Users module.
 */

import { Module } from '@nestjs/common';
import { UsersInfrastructureModule } from '../infrastructure/users.infrastructure.module';
import { SharedModule } from '../../../shared/shared.module';
import { AuthModule } from '../../../shared/auth/auth.module';
import { UserLoginUseCase } from './user-login.use-case';
import { UserLogoutUseCase } from './user-logout.use-case';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import { PasswordResetRequestUseCase } from './password-reset-request.use-case';
import { PasswordResetConfirmUseCase } from './password-reset-confirm.use-case';
import { CreateUserUseCase } from './create-user.use-case';
import { SearchUsersUseCase } from './search-users.use-case';

@Module({
  imports: [
    UsersInfrastructureModule,
    SharedModule,
    AuthModule, // Import AuthModule to get Firebase integration services
  ],
  providers: [
    UserLoginUseCase,
    UserLogoutUseCase,
    RefreshTokenUseCase,
    PasswordResetRequestUseCase,
    PasswordResetConfirmUseCase,
    CreateUserUseCase,
    SearchUsersUseCase,
  ],
  exports: [
    UserLoginUseCase,
    UserLogoutUseCase,
    RefreshTokenUseCase,
    PasswordResetRequestUseCase,
    PasswordResetConfirmUseCase,
    CreateUserUseCase,
    SearchUsersUseCase,
  ],
})
export class UsersApplicationModule {}

