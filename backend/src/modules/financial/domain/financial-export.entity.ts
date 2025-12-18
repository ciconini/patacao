/**
 * FinancialExport Domain Entity
 *
 * Represents a financial export in the petshop management system.
 * Financial exports are generated reports containing financial data (invoices, transactions, etc.)
 * for accounting purposes. Once generated, exports are immutable.
 * This is a pure domain entity with no framework dependencies.
 *
 * Business Rules:
 * - FinancialExport must be linked to a Company (invariant)
 * - Export format must be CSV or JSON
 * - Export must have either file_path or sftp_reference when generated
 * - Exports must include all fields required by accountant and be immutable once generated
 * - Period dates must be valid (period_end after period_start if both provided)
 */

export enum ExportFormat {
  CSV = 'CSV',
  JSON = 'JSON',
}

export class FinancialExport {
  private readonly _id: string;
  private readonly _companyId: string;
  private _periodStart?: Date;
  private _periodEnd?: Date;
  private _format: ExportFormat;
  private _filePath?: string;
  private _sftpReference?: string;
  private readonly _createdBy: string; // User ID
  private readonly _createdAt: Date;

  /**
   * Creates a new FinancialExport entity
   *
   * @param id - Unique identifier (UUID)
   * @param companyId - Company ID this export belongs to (required)
   * @param createdBy - User ID who created the export (required)
   * @param format - Export format (CSV or JSON, default CSV)
   * @param periodStart - Start date of the export period
   * @param periodEnd - End date of the export period
   * @param filePath - File path where export is stored
   * @param sftpReference - SFTP reference for remote storage
   * @param createdAt - Creation timestamp (defaults to now)
   *
   * @throws Error if id is empty
   * @throws Error if companyId is empty
   * @throws Error if createdBy is empty
   * @throws Error if periodEnd is before periodStart
   * @throws Error if both filePath and sftpReference are provided
   */
  constructor(
    id: string,
    companyId: string,
    createdBy: string,
    format: ExportFormat = ExportFormat.CSV,
    periodStart?: Date,
    periodEnd?: Date,
    filePath?: string,
    sftpReference?: string,
    createdAt?: Date,
  ) {
    this.validateId(id);
    this.validateCompanyId(companyId);
    this.validateCreatedBy(createdBy);

    if (periodStart && periodEnd) {
      this.validatePeriodRange(periodStart, periodEnd);
    }

    if (filePath && sftpReference) {
      throw new Error('Cannot have both file_path and sftp_reference - use one or the other');
    }

    this._id = id;
    this._companyId = companyId;
    this._periodStart = periodStart ? new Date(periodStart) : undefined;
    this._periodEnd = periodEnd ? new Date(periodEnd) : undefined;
    this._format = format;
    this._filePath = filePath;
    this._sftpReference = sftpReference;
    this._createdBy = createdBy;
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
  }

  // Getters (read-only access to private fields)
  get id(): string {
    return this._id;
  }

  get companyId(): string {
    return this._companyId;
  }

  get periodStart(): Date | undefined {
    return this._periodStart ? new Date(this._periodStart) : undefined;
  }

  get periodEnd(): Date | undefined {
    return this._periodEnd ? new Date(this._periodEnd) : undefined;
  }

  get format(): ExportFormat {
    return this._format;
  }

  get filePath(): string | undefined {
    return this._filePath;
  }

  get sftpReference(): string | undefined {
    return this._sftpReference;
  }

  get createdBy(): string {
    return this._createdBy;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  /**
   * Updates the period start date
   *
   * @param periodStart - New period start date
   * @throws Error if periodEnd exists and is before periodStart
   * @throws Error if export is already generated
   */
  updatePeriodStart(periodStart: Date | undefined): void {
    if (this.isGenerated()) {
      throw new Error('Cannot update period start after export is generated');
    }
    if (periodStart && this._periodEnd && periodStart > this._periodEnd) {
      throw new Error('Period start cannot be after period end');
    }
    this._periodStart = periodStart ? new Date(periodStart) : undefined;
  }

  /**
   * Updates the period end date
   *
   * @param periodEnd - New period end date
   * @throws Error if periodStart exists and periodEnd is before it
   * @throws Error if export is already generated
   */
  updatePeriodEnd(periodEnd: Date | undefined): void {
    if (this.isGenerated()) {
      throw new Error('Cannot update period end after export is generated');
    }
    if (periodEnd && this._periodStart && periodEnd < this._periodStart) {
      throw new Error('Period end cannot be before period start');
    }
    this._periodEnd = periodEnd ? new Date(periodEnd) : undefined;
  }

  /**
   * Updates the export format
   *
   * @param format - New export format
   * @throws Error if export is already generated
   */
  updateFormat(format: ExportFormat): void {
    if (this.isGenerated()) {
      throw new Error('Cannot update format after export is generated');
    }
    this._format = format;
  }

  /**
   * Sets the file path (for local storage)
   *
   * @param filePath - File path where export is stored
   * @throws Error if sftpReference is already set
   * @throws Error if export is already generated
   */
  setFilePath(filePath: string): void {
    if (this.isGenerated()) {
      throw new Error('Cannot update file path after export is generated');
    }
    if (this._sftpReference) {
      throw new Error('Cannot set file path when sftp_reference is already set');
    }
    if (!filePath || filePath.trim().length === 0) {
      throw new Error('File path cannot be empty');
    }
    this._filePath = filePath;
    this._sftpReference = undefined;
  }

  /**
   * Sets the SFTP reference (for remote storage)
   *
   * @param sftpReference - SFTP reference for remote storage
   * @throws Error if filePath is already set
   * @throws Error if export is already generated
   */
  setSftpReference(sftpReference: string): void {
    if (this.isGenerated()) {
      throw new Error('Cannot update sftp reference after export is generated');
    }
    if (this._filePath) {
      throw new Error('Cannot set sftp reference when file_path is already set');
    }
    if (!sftpReference || sftpReference.trim().length === 0) {
      throw new Error('SFTP reference cannot be empty');
    }
    this._sftpReference = sftpReference;
    this._filePath = undefined;
  }

  /**
   * Checks if the export is generated (has file path or SFTP reference)
   *
   * @returns True if export has file path or SFTP reference
   */
  isGenerated(): boolean {
    return this._filePath !== undefined || this._sftpReference !== undefined;
  }

  /**
   * Checks if the export has a file path
   *
   * @returns True if file path is set
   */
  hasFilePath(): boolean {
    return this._filePath !== undefined;
  }

  /**
   * Checks if the export has an SFTP reference
   *
   * @returns True if SFTP reference is set
   */
  hasSftpReference(): boolean {
    return this._sftpReference !== undefined;
  }

  /**
   * Checks if the export has a period defined
   *
   * @returns True if both period start and end are set
   */
  hasPeriod(): boolean {
    return this._periodStart !== undefined && this._periodEnd !== undefined;
  }

  /**
   * Calculates the period duration in days
   *
   * @returns Number of days in the period, or undefined if period is not fully defined
   */
  getPeriodDurationDays(): number | undefined {
    if (!this._periodStart || !this._periodEnd) {
      return undefined;
    }
    const diffMs = this._periodEnd.getTime() - this._periodStart.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
  }

  /**
   * Checks if the export format is CSV
   *
   * @returns True if format is CSV
   */
  isCsvFormat(): boolean {
    return this._format === ExportFormat.CSV;
  }

  /**
   * Checks if the export format is JSON
   *
   * @returns True if format is JSON
   */
  isJsonFormat(): boolean {
    return this._format === ExportFormat.JSON;
  }

  /**
   * Checks if the export can be modified
   * Exports are immutable once generated
   *
   * @returns True if export is not yet generated
   */
  canBeModified(): boolean {
    return !this.isGenerated();
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('FinancialExport ID is required');
    }
  }

  private validateCompanyId(companyId: string): void {
    if (!companyId || companyId.trim().length === 0) {
      throw new Error('Company ID is required - a FinancialExport must be linked to a Company');
    }
  }

  private validateCreatedBy(createdBy: string): void {
    if (!createdBy || createdBy.trim().length === 0) {
      throw new Error('Created by user ID is required');
    }
  }

  private validatePeriodRange(periodStart: Date, periodEnd: Date): void {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    if (end < start) {
      throw new Error('Period end date cannot be before period start date');
    }
  }
}
