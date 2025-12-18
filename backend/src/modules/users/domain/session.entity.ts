/**
 * Session Domain Entity
 *
 * Represents an authentication session for a user in the petshop management system.
 * This entity tracks user sessions for access control and security.
 * This is a pure domain entity with no framework dependencies.
 *
 * Business Rules:
 * - A Session must be linked to a User (invariant)
 * - Revoking a Session immediately denies access
 * - Sessions can expire based on expires_at timestamp
 * - Tokens must be short-lived and refresh tokens revocable
 */

export class Session {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _createdAt: Date;
  private _expiresAt?: Date;
  private _revoked: boolean;
  private _revokedAt?: Date;

  /**
   * Creates a new Session entity
   *
   * @param id - Unique identifier (UUID)
   * @param userId - User ID that owns this session (required)
   * @param createdAt - Session creation timestamp (defaults to now)
   * @param expiresAt - Session expiration timestamp
   * @param revoked - Whether the session is revoked (default false)
   * @param revokedAt - Timestamp when session was revoked
   *
   * @throws Error if id is empty
   * @throws Error if userId is empty
   * @throws Error if expiresAt is before createdAt
   */
  constructor(
    id: string,
    userId: string,
    createdAt?: Date,
    expiresAt?: Date,
    revoked: boolean = false,
    revokedAt?: Date,
  ) {
    this.validateId(id);
    this.validateUserId(userId);

    const created = createdAt ? new Date(createdAt) : new Date();

    if (expiresAt) {
      this.validateExpirationDate(created, expiresAt);
    }

    if (revoked && !revokedAt) {
      throw new Error('Revoked session must have a revokedAt timestamp');
    }

    this._id = id;
    this._userId = userId;
    this._createdAt = created;
    this._expiresAt = expiresAt ? new Date(expiresAt) : undefined;
    this._revoked = revoked;
    this._revokedAt = revokedAt ? new Date(revokedAt) : undefined;
  }

  // Getters (read-only access to private fields)
  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get expiresAt(): Date | undefined {
    return this._expiresAt ? new Date(this._expiresAt) : undefined;
  }

  get revoked(): boolean {
    return this._revoked;
  }

  get revokedAt(): Date | undefined {
    return this._revokedAt ? new Date(this._revokedAt) : undefined;
  }

  /**
   * Sets the expiration date for the session
   *
   * @param expiresAt - Expiration timestamp
   * @throws Error if expiresAt is before createdAt
   */
  setExpirationDate(expiresAt: Date | undefined): void {
    if (expiresAt) {
      this.validateExpirationDate(this._createdAt, expiresAt);
      this._expiresAt = new Date(expiresAt);
    } else {
      this._expiresAt = undefined;
    }
  }

  /**
   * Revokes the session
   * Revoking a session immediately denies access
   */
  revoke(): void {
    if (!this._revoked) {
      this._revoked = true;
      this._revokedAt = new Date();
    }
  }

  /**
   * Checks if the session is valid (not revoked and not expired)
   *
   * @param referenceDate - Date to check against (defaults to now)
   * @returns True if session is valid
   */
  isValid(referenceDate: Date = new Date()): boolean {
    if (this._revoked) {
      return false;
    }

    if (this._expiresAt && referenceDate > this._expiresAt) {
      return false;
    }

    return true;
  }

  /**
   * Checks if the session is expired
   *
   * @param referenceDate - Date to check against (defaults to now)
   * @returns True if session is expired
   */
  isExpired(referenceDate: Date = new Date()): boolean {
    if (!this._expiresAt) {
      return false; // No expiration date means never expires
    }

    return referenceDate > this._expiresAt;
  }

  /**
   * Checks if the session is revoked
   *
   * @returns True if session is revoked
   */
  isRevoked(): boolean {
    return this._revoked;
  }

  /**
   * Calculates the remaining time until expiration in milliseconds
   *
   * @param referenceDate - Date to calculate from (defaults to now)
   * @returns Remaining time in milliseconds, or undefined if no expiration or already expired
   */
  getRemainingTimeMs(referenceDate: Date = new Date()): number | undefined {
    if (!this._expiresAt) {
      return undefined; // No expiration
    }

    if (referenceDate >= this._expiresAt) {
      return undefined; // Already expired
    }

    return this._expiresAt.getTime() - referenceDate.getTime();
  }

  /**
   * Calculates the remaining time until expiration in seconds
   *
   * @param referenceDate - Date to calculate from (defaults to now)
   * @returns Remaining time in seconds, or undefined if no expiration or already expired
   */
  getRemainingTimeSeconds(referenceDate: Date = new Date()): number | undefined {
    const ms = this.getRemainingTimeMs(referenceDate);
    return ms !== undefined ? Math.floor(ms / 1000) : undefined;
  }

  /**
   * Calculates the session duration in milliseconds
   *
   * @param referenceDate - Date to calculate to (defaults to now, or expiresAt if expired)
   * @returns Session duration in milliseconds
   */
  getDurationMs(referenceDate?: Date): number {
    const endDate =
      referenceDate || (this._expiresAt && this.isExpired() ? this._expiresAt : new Date());
    return endDate.getTime() - this._createdAt.getTime();
  }

  /**
   * Calculates the session duration in seconds
   *
   * @param referenceDate - Date to calculate to (defaults to now, or expiresAt if expired)
   * @returns Session duration in seconds
   */
  getDurationSeconds(referenceDate?: Date): number {
    return Math.floor(this.getDurationMs(referenceDate) / 1000);
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Session ID is required');
    }
  }

  private validateUserId(userId: string): void {
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID is required - a Session must be linked to a User');
    }
  }

  private validateExpirationDate(createdAt: Date, expiresAt: Date): void {
    if (new Date(expiresAt) <= new Date(createdAt)) {
      throw new Error('Expiration date must be after creation date');
    }
  }
}
