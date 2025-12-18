/**
 * CurrentUserRepository Adapter
 *
 * Adapter that provides a simplified interface for getting current user information.
 * This wraps UserRepository to provide only the minimal interface needed by use cases.
 *
 * This belongs to the Infrastructure/Adapters layer.
 */

import { Injectable, Inject } from '@nestjs/common';
import { UserRepository } from '../ports/user.repository.port';

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

@Injectable()
export class CurrentUserRepositoryAdapter implements CurrentUserRepository {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Finds a user by ID and returns minimal information (id and roleIds)
   *
   * @param id - User ID
   * @returns Promise that resolves to user with id and roleIds, or null if not found
   */
  async findById(id: string): Promise<{ id: string; roleIds: string[] } | null> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      roleIds: [...user.roleIds], // Create a copy since roleIds is readonly
    };
  }
}

