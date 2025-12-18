/**
 * SessionRepository Port (Interface)
 *
 * Repository interface for Session domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 *
 * Implementations should be provided in the Infrastructure layer.
 */

import { Session } from '../domain/session.entity';

export interface SessionRepository {
  /**
   * Saves a Session entity (creates or updates)
   *
   * @param session - Session domain entity to save
   * @returns Saved Session entity
   */
  save(session: Session): Promise<Session>;

  /**
   * Saves a Session with a refresh token
   * This is a helper method for storing refresh tokens
   *
   * @param session - Session domain entity
   * @param refreshToken - Refresh token to store
   */
  saveWithRefreshToken(session: Session, refreshToken: string): Promise<void>;

  /**
   * Finds a Session by ID
   *
   * @param sessionId - Session ID
   * @returns Session entity or null if not found
   */
  findById(sessionId: string): Promise<Session | null>;

  /**
   * Finds a Session by refresh token
   *
   * @param refreshToken - Refresh token to search for
   * @returns Session entity or null if not found
   */
  findByRefreshToken(refreshToken: string): Promise<Session | null>;

  /**
   * Revokes a session by ID
   *
   * @param sessionId - Session ID to revoke
   */
  revoke(sessionId: string): Promise<void>;

  /**
   * Revokes a session by refresh token
   *
   * @param refreshToken - Refresh token to revoke
   */
  revokeByRefreshToken(refreshToken: string): Promise<void>;

  /**
   * Revokes all sessions for a user
   *
   * @param userId - User ID
   */
  revokeAllByUserId(userId: string): Promise<void>;
}
