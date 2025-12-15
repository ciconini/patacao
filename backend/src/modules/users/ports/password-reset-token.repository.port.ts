/**
 * PasswordResetTokenRepository Port (Interface)
 * 
 * Repository interface for PasswordResetToken persistence.
 * This is a port in the Hexagonal Architecture pattern.
 * 
 * Note: PasswordResetToken is not a domain entity but a value object/model
 * used for password reset functionality.
 * 
 * Implementations should be provided in the Infrastructure layer.
 */

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface PasswordResetTokenRepository {
  /**
   * Saves a password reset token
   * 
   * @param token - Password reset token to save
   * @returns Saved token
   */
  save(token: PasswordResetToken): Promise<PasswordResetToken>;

  /**
   * Finds a token by its hash
   * 
   * @param tokenHash - Token hash to search for
   * @returns Token or null if not found
   */
  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;

  /**
   * Marks a token as used
   * 
   * @param tokenId - Token ID to mark as used
   */
  markAsUsed(tokenId: string): Promise<void>;

  /**
   * Invalidates all existing tokens for a user
   * 
   * @param userId - User ID
   */
  invalidateExistingTokens(userId: string): Promise<void>;
}

