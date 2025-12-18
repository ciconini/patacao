/**
 * Invoice Domain Entity
 *
 * Represents an invoice in the petshop management system.
 * Invoices are fiscal documents that record sales transactions with customers.
 * Once issued, invoices become immutable and corrections require void/credit-note flows.
 * This is a pure domain entity with no framework dependencies.
 *
 * Business Rules:
 * - Invoice must be linked to a Company and Store (invariants)
 * - Invoice number must be sequential and unique (enforced at repository/use case level)
 * - Invoice cannot be issued without valid Company NIF and sequential invoice_number
 * - Once issued, editing is restricted; void/credit-note flows are required to correct
 * - Invoice lines can reference products or services
 * - Totals (subtotal, vat_total, total) must be calculated from lines
 */

export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export interface InvoiceLine {
  readonly description: string;
  readonly productId?: string;
  readonly serviceId?: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly vatRate: number;
}

export class Invoice {
  private readonly _id: string;
  private readonly _companyId: string;
  private readonly _storeId: string;
  private _invoiceNumber: string;
  private _issuedAt?: Date;
  private _buyerCustomerId?: string;
  private _lines: InvoiceLine[];
  private _subtotal!: number;
  private _vatTotal!: number;
  private _total!: number;
  private _status: InvoiceStatus;
  private _paidAt?: Date;
  private _paymentMethod?: string;
  private _externalReference?: string;
  private readonly _createdBy: string; // User ID
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Creates a new Invoice entity
   *
   * @param id - Unique identifier (UUID)
   * @param companyId - Company ID that issues the invoice (required)
   * @param storeId - Store ID where invoice is issued (required)
   * @param invoiceNumber - Sequential invoice number (required)
   * @param createdBy - User ID who created the invoice (required)
   * @param buyerCustomerId - Customer ID who is the buyer
   * @param lines - List of invoice line items
   * @param status - Invoice status (default DRAFT)
   * @param issuedAt - Date when invoice was issued
   * @param paidAt - Date when invoice was paid
   * @param paymentMethod - Payment method used
   * @param externalReference - External reference (e.g., payment gateway reference)
   * @param createdAt - Creation timestamp
   * @param updatedAt - Last update timestamp
   *
   * @throws Error if id is empty
   * @throws Error if companyId is empty
   * @throws Error if storeId is empty
   * @throws Error if invoiceNumber is empty
   * @throws Error if createdBy is empty
   * @throws Error if any line is invalid
   */
  constructor(
    id: string,
    companyId: string,
    storeId: string,
    invoiceNumber: string,
    createdBy: string,
    buyerCustomerId?: string,
    lines: InvoiceLine[] = [],
    status: InvoiceStatus = InvoiceStatus.DRAFT,
    issuedAt?: Date,
    paidAt?: Date,
    paymentMethod?: string,
    externalReference?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.validateId(id);
    this.validateCompanyId(companyId);
    this.validateStoreId(storeId);
    this.validateInvoiceNumber(invoiceNumber);
    this.validateCreatedBy(createdBy);

    if (lines.length > 0) {
      this.validateInvoiceLines(lines);
    }

    // Validate that issued_at is set when status is ISSUED
    if (status === InvoiceStatus.ISSUED && !issuedAt) {
      throw new Error('Invoice cannot be ISSUED without issued_at date');
    }

    this._id = id;
    this._companyId = companyId;
    this._storeId = storeId;
    this._invoiceNumber = invoiceNumber;
    this._buyerCustomerId = buyerCustomerId;
    this._lines = lines.map((line) => ({ ...line }));
    this._status = status;
    this._createdBy = createdBy;
    this._issuedAt = issuedAt ? new Date(issuedAt) : undefined;
    this._paidAt = paidAt ? new Date(paidAt) : undefined;
    this._paymentMethod = paymentMethod;
    this._externalReference = externalReference;
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
    this._updatedAt = updatedAt ? new Date(updatedAt) : new Date();

    // Calculate totals from lines
    this.recalculateTotals();
  }

  // Getters (read-only access to private fields)
  get id(): string {
    return this._id;
  }

  get companyId(): string {
    return this._companyId;
  }

  get storeId(): string {
    return this._storeId;
  }

  get invoiceNumber(): string {
    return this._invoiceNumber;
  }

  get issuedAt(): Date | undefined {
    return this._issuedAt ? new Date(this._issuedAt) : undefined;
  }

  get buyerCustomerId(): string | undefined {
    return this._buyerCustomerId;
  }

  get lines(): ReadonlyArray<InvoiceLine> {
    return this._lines.map((line) => ({ ...line }));
  }

  get subtotal(): number {
    return this._subtotal;
  }

  get vatTotal(): number {
    return this._vatTotal;
  }

  get total(): number {
    return this._total;
  }

  get status(): InvoiceStatus {
    return this._status;
  }

  get paidAt(): Date | undefined {
    return this._paidAt ? new Date(this._paidAt) : undefined;
  }

  get paymentMethod(): string | undefined {
    return this._paymentMethod;
  }

  get externalReference(): string | undefined {
    return this._externalReference;
  }

  get createdBy(): string {
    return this._createdBy;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Updates the invoice number
   * Note: Invoice number uniqueness must be validated at repository/use case level
   *
   * @param invoiceNumber - New invoice number
   * @throws Error if invoiceNumber is empty
   * @throws Error if invoice is already issued
   */
  updateInvoiceNumber(invoiceNumber: string): void {
    if (this._status !== InvoiceStatus.DRAFT) {
      throw new Error('Cannot update invoice number after invoice is issued');
    }
    this.validateInvoiceNumber(invoiceNumber);
    this._invoiceNumber = invoiceNumber;
    this._updatedAt = new Date();
  }

  /**
   * Updates the buyer customer ID
   *
   * @param buyerCustomerId - New buyer customer ID
   * @throws Error if invoice is already issued
   */
  updateBuyerCustomerId(buyerCustomerId: string | undefined): void {
    if (this._status !== InvoiceStatus.DRAFT) {
      throw new Error('Cannot update buyer customer ID after invoice is issued');
    }
    this._buyerCustomerId = buyerCustomerId;
    this._updatedAt = new Date();
  }

  /**
   * Adds an invoice line item
   *
   * @param line - Invoice line to add
   * @throws Error if line is invalid
   * @throws Error if invoice is already issued
   */
  addLine(line: InvoiceLine): void {
    if (this._status !== InvoiceStatus.DRAFT) {
      throw new Error('Cannot add lines after invoice is issued');
    }
    this.validateInvoiceLine(line);
    this._lines.push({ ...line });
    this.recalculateTotals();
    this._updatedAt = new Date();
  }

  /**
   * Removes an invoice line item by index
   *
   * @param index - Index of the line to remove
   * @throws Error if index is out of bounds
   * @throws Error if invoice is already issued
   */
  removeLine(index: number): void {
    if (this._status !== InvoiceStatus.DRAFT) {
      throw new Error('Cannot remove lines after invoice is issued');
    }
    if (index < 0 || index >= this._lines.length) {
      throw new Error('Invoice line index out of bounds');
    }
    this._lines.splice(index, 1);
    this.recalculateTotals();
    this._updatedAt = new Date();
  }

  /**
   * Updates an invoice line item by index
   *
   * @param index - Index of the line to update
   * @param line - New line data
   * @throws Error if index is out of bounds or line is invalid
   * @throws Error if invoice is already issued
   */
  updateLine(index: number, line: InvoiceLine): void {
    if (this._status !== InvoiceStatus.DRAFT) {
      throw new Error('Cannot update lines after invoice is issued');
    }
    if (index < 0 || index >= this._lines.length) {
      throw new Error('Invoice line index out of bounds');
    }
    this.validateInvoiceLine(line);
    this._lines[index] = { ...line };
    this.recalculateTotals();
    this._updatedAt = new Date();
  }

  /**
   * Sets all invoice lines
   *
   * @param lines - New list of invoice lines
   * @throws Error if any line is invalid
   * @throws Error if invoice is already issued
   */
  setLines(lines: InvoiceLine[]): void {
    if (this._status !== InvoiceStatus.DRAFT) {
      throw new Error('Cannot set lines after invoice is issued');
    }
    this.validateInvoiceLines(lines);
    this._lines = lines.map((line) => ({ ...line }));
    this.recalculateTotals();
    this._updatedAt = new Date();
  }

  /**
   * Issues the invoice
   * Note: Company NIF and sequential invoice_number validation must be done at use case level
   *
   * @param issuedAt - Date when invoice is issued (defaults to now)
   * @throws Error if invoice is not in DRAFT status
   */
  issue(issuedAt: Date = new Date()): void {
    if (this._status !== InvoiceStatus.DRAFT) {
      throw new Error(`Cannot issue invoice with status: ${this._status}`);
    }
    if (this._lines.length === 0) {
      throw new Error('Cannot issue invoice without line items');
    }
    this._status = InvoiceStatus.ISSUED;
    this._issuedAt = new Date(issuedAt);
    this._updatedAt = new Date();
  }

  /**
   * Marks the invoice as paid
   *
   * @param paidAt - Date when invoice was paid (defaults to now)
   * @param paymentMethod - Payment method used
   * @param externalReference - External reference (e.g., payment gateway reference)
   * @throws Error if invoice is not in ISSUED status
   */
  markAsPaid(paidAt: Date = new Date(), paymentMethod?: string, externalReference?: string): void {
    if (this._status !== InvoiceStatus.ISSUED) {
      throw new Error(`Cannot mark invoice as paid with status: ${this._status}`);
    }
    this._status = InvoiceStatus.PAID;
    this._paidAt = new Date(paidAt);
    this._paymentMethod = paymentMethod;
    this._externalReference = externalReference;
    this._updatedAt = new Date();
  }

  /**
   * Cancels the invoice
   *
   * @throws Error if invoice is already paid, cancelled, or refunded
   */
  cancel(): void {
    if (this._status === InvoiceStatus.PAID) {
      throw new Error('Cannot cancel a paid invoice - use refund flow instead');
    }
    if (this._status === InvoiceStatus.CANCELLED) {
      throw new Error('Invoice is already cancelled');
    }
    if (this._status === InvoiceStatus.REFUNDED) {
      throw new Error('Cannot cancel a refunded invoice');
    }
    this._status = InvoiceStatus.CANCELLED;
    this._updatedAt = new Date();
  }

  /**
   * Marks the invoice as refunded
   *
   * @throws Error if invoice is not in PAID status
   */
  markAsRefunded(): void {
    if (this._status !== InvoiceStatus.PAID) {
      throw new Error(`Cannot mark invoice as refunded with status: ${this._status}`);
    }
    this._status = InvoiceStatus.REFUNDED;
    this._updatedAt = new Date();
  }

  /**
   * Recalculates totals from invoice lines
   * This is called automatically when lines are modified
   */
  private recalculateTotals(): void {
    let subtotal = 0;
    let vatTotal = 0;

    for (const line of this._lines) {
      const lineSubtotal = line.quantity * line.unitPrice;
      const lineVat = lineSubtotal * (line.vatRate / 100);

      subtotal += lineSubtotal;
      vatTotal += lineVat;
    }

    this._subtotal = subtotal;
    this._vatTotal = vatTotal;
    this._total = subtotal + vatTotal;
  }

  /**
   * Checks if the invoice can be modified
   *
   * @returns True if invoice is in DRAFT status
   */
  canBeModified(): boolean {
    return this._status === InvoiceStatus.DRAFT;
  }

  /**
   * Checks if the invoice can be issued
   *
   * @returns True if invoice is in DRAFT status and has lines
   */
  canBeIssued(): boolean {
    return this._status === InvoiceStatus.DRAFT && this._lines.length > 0;
  }

  /**
   * Checks if the invoice can be cancelled
   *
   * @returns True if invoice can be cancelled
   */
  canBeCancelled(): boolean {
    return (
      this._status !== InvoiceStatus.PAID &&
      this._status !== InvoiceStatus.CANCELLED &&
      this._status !== InvoiceStatus.REFUNDED
    );
  }

  /**
   * Checks if the invoice is in draft status
   *
   * @returns True if status is DRAFT
   */
  isDraft(): boolean {
    return this._status === InvoiceStatus.DRAFT;
  }

  /**
   * Checks if the invoice is issued
   *
   * @returns True if status is ISSUED
   */
  isIssued(): boolean {
    return this._status === InvoiceStatus.ISSUED;
  }

  /**
   * Checks if the invoice is paid
   *
   * @returns True if status is PAID
   */
  isPaid(): boolean {
    return this._status === InvoiceStatus.PAID;
  }

  /**
   * Checks if the invoice is cancelled
   *
   * @returns True if status is CANCELLED
   */
  isCancelled(): boolean {
    return this._status === InvoiceStatus.CANCELLED;
  }

  /**
   * Checks if the invoice is refunded
   *
   * @returns True if status is REFUNDED
   */
  isRefunded(): boolean {
    return this._status === InvoiceStatus.REFUNDED;
  }

  /**
   * Checks if the invoice has a buyer customer
   *
   * @returns True if buyer customer ID is set
   */
  hasBuyer(): boolean {
    return this._buyerCustomerId !== undefined;
  }

  /**
   * Gets the number of line items
   *
   * @returns Number of invoice lines
   */
  getLineCount(): number {
    return this._lines.length;
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Invoice ID is required');
    }
  }

  private validateCompanyId(companyId: string): void {
    if (!companyId || companyId.trim().length === 0) {
      throw new Error('Company ID is required - an Invoice must be linked to a Company');
    }
  }

  private validateStoreId(storeId: string): void {
    if (!storeId || storeId.trim().length === 0) {
      throw new Error('Store ID is required - an Invoice must be linked to a Store');
    }
  }

  private validateInvoiceNumber(invoiceNumber: string): void {
    if (!invoiceNumber || invoiceNumber.trim().length === 0) {
      throw new Error('Invoice number is required');
    }
  }

  private validateCreatedBy(createdBy: string): void {
    if (!createdBy || createdBy.trim().length === 0) {
      throw new Error('Created by user ID is required');
    }
  }

  private validateInvoiceLines(lines: InvoiceLine[]): void {
    for (const line of lines) {
      this.validateInvoiceLine(line);
    }
  }

  private validateInvoiceLine(line: InvoiceLine): void {
    if (!line.description || line.description.trim().length === 0) {
      throw new Error('Invoice line description is required');
    }

    // At least one of productId or serviceId should be provided (but both are optional)
    // This is a business rule - lines can be for products, services, or other items

    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new Error('Invoice line quantity must be a positive integer');
    }

    if (line.unitPrice < 0) {
      throw new Error('Invoice line unit price cannot be negative');
    }

    if (line.vatRate < 0 || line.vatRate > 100) {
      throw new Error('Invoice line VAT rate must be between 0 and 100');
    }
  }
}
