/**
 * Password Hasher Service
 * 
 * Service for hashing and verifying passwords using bcrypt.
 * This service implements the PasswordHasher interface used by authentication use cases.
 */

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

@Injectable()
export class PasswordHasherService implements PasswordHasher {
  private readonly SALT_ROUNDS = 12;

  /**
   * Hashes a password using bcrypt
   * 
   * @param password - Plain text password
   * @returns Hashed password
   */
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verifies a password against a hash
   * 
   * @param password - Plain text password
   * @param hash - Hashed password to compare against
   * @returns True if password matches hash, false otherwise
   */
  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
