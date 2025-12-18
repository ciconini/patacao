/**
 * Users Presentation Module
 *
 * NestJS module that registers all controllers for the Users module.
 */

import { Module } from '@nestjs/common';
import { UsersApplicationModule } from '../application/users.application.module';
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';

@Module({
  imports: [UsersApplicationModule],
  controllers: [AuthController, UserController],
})
export class UsersPresentationModule {}
