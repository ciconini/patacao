/**
 * Users Presentation Module
 *
 * NestJS module that registers all controllers for the Users module.
 */

import { Module } from '@nestjs/common';
import { UsersApplicationModule } from '../application/users.application.module';
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { RoleController } from './controllers/role.controller';
import { SessionController } from './controllers/session.controller';

@Module({
  imports: [UsersApplicationModule],
  controllers: [AuthController, UserController, RoleController, SessionController],
})
export class UsersPresentationModule {}
