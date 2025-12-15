/**
 * InvoiceCalculationDomainService
 * 
 * Domain service responsible for calculating invoice totals.
 * This service handles calculation of subtotal, VAT total, and grand total
 * for invoices with mixed product and service lines, respecting VAT rates per line.
 * 
 * Responsibilities:
 * - Calculate subtotal from invoice lines
 * - Calculate VAT total respecting per-line VAT rates
 * - Calculate grand total (subtotal + VAT total)
 * - Handle mixed product/service lines
 * - Provide detailed calculation breakdowns
 * 
 * Collaborating Entities:
 * - Invoice: The invoice entity containing lines to calculate
 * - InvoiceLine: Individual line items with product/service references, quantities, prices, and VAT rates
 * 
 * Business Rules Enforced:
 * - BR: Totals (subtotal, vat_total, total) must be calculated from lines
 * - BR: Each line can have its own VAT rate (0-100)
 * - BR: Lines can reference products or services (or neither)
 * - BR: Subtotal = sum of (quantity * unitPrice) for all lines
 * - BR: VAT total = sum of (lineSubtotal * vatRate / 100) for all lines
 * - BR: Grand total = subtotal + VAT total
 * - BR: VAT calculation is per-line, not aggregated
 * 
 * Invariants:
 * - Invoice must have at least one line for non-zero totals
 * - Line quantities must be positive
 * - Line unit prices must be non-negative
 * - Line VAT rates must be between 0 and 100
 * - Calculation results must be non-negative
 * 
 * Edge Cases:
 * - Invoice with no lines (all totals = 0)
 * - Lines with zero quantity (contribute 0 to totals)
 * - Lines with zero unit price (contribute 0 to totals)
 * - Lines with zero VAT rate (no VAT on that line)
 * - Lines with 100% VAT rate
 * - Mixed lines with different VAT rates
 * - Lines with only productId, only serviceId, or neither
 * - Very large quantities or prices (precision handling)
 * - Rounding precision for VAT calculations
 */

import { Invoice, InvoiceLine } from './invoice.entity';

export interface LineCalculation {
  lineIndex: number;
  description: string;
  productId?: string;
  serviceId?: string;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
}

export interface InvoiceCalculationResult {
  subtotal: number;
  vatTotal: number;
  total: number;
  lineCalculations: LineCalculation[];
  lineCount: number;
}

export class InvoiceCalculationDomainService {
  /**
   * Calculates all totals for an invoice.
   * 
   * This method calculates subtotal, VAT total, and grand total from invoice lines,
   * respecting per-line VAT rates and handling mixed product/service lines.
   * 
   * Business Rule: Totals must be calculated from lines
   * Business Rule: VAT calculation is per-line, not aggregated
   * 
   * @param invoice - The invoice to calculate totals for
   * @returns Calculation result with subtotal, VAT total, total, and line breakdowns
   * @throws Error if invoice is not provided
   */
  calculateInvoiceTotals(invoice: Invoice): InvoiceCalculationResult {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    const lines = invoice.lines;
    const lineCalculations: LineCalculation[] = [];
    
    let subtotal = 0;
    let vatTotal = 0;

    // Calculate each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineCalc = this.calculateLineTotals(line, i);
      
      lineCalculations.push(lineCalc);
      subtotal += lineCalc.lineSubtotal;
      vatTotal += lineCalc.vatAmount;
    }

    const total = subtotal + vatTotal;

    return {
      subtotal: this.roundToTwoDecimals(subtotal),
      vatTotal: this.roundToTwoDecimals(vatTotal),
      total: this.roundToTwoDecimals(total),
      lineCalculations,
      lineCount: lines.length,
    };
  }

  /**
   * Calculates totals for a single invoice line.
   * 
   * Business Rule: Line subtotal = quantity * unitPrice
   * Business Rule: Line VAT amount = lineSubtotal * vatRate / 100
   * Business Rule: Line total = lineSubtotal + vatAmount
   * 
   * @param line - The invoice line to calculate
   * @param lineIndex - Index of the line (for reference)
   * @returns Line calculation breakdown
   * @throws Error if line is not provided
   */
  calculateLineTotals(line: InvoiceLine, lineIndex: number = 0): LineCalculation {
    if (!line) {
      throw new Error('Invoice line is required');
    }

    // Line subtotal = quantity * unitPrice
    const lineSubtotal = line.quantity * line.unitPrice;

    // Line VAT amount = lineSubtotal * vatRate / 100
    const vatAmount = lineSubtotal * (line.vatRate / 100);

    // Line total = lineSubtotal + vatAmount
    const lineTotal = lineSubtotal + vatAmount;

    return {
      lineIndex,
      description: line.description,
      productId: line.productId,
      serviceId: line.serviceId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineSubtotal: this.roundToTwoDecimals(lineSubtotal),
      vatRate: line.vatRate,
      vatAmount: this.roundToTwoDecimals(vatAmount),
      lineTotal: this.roundToTwoDecimals(lineTotal),
    };
  }

  /**
   * Calculates only the subtotal for an invoice.
   * 
   * Business Rule: Subtotal = sum of (quantity * unitPrice) for all lines
   * 
   * @param invoice - The invoice to calculate subtotal for
   * @returns Subtotal amount
   */
  calculateSubtotal(invoice: Invoice): number {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    let subtotal = 0;

    for (const line of invoice.lines) {
      subtotal += line.quantity * line.unitPrice;
    }

    return this.roundToTwoDecimals(subtotal);
  }

  /**
   * Calculates only the VAT total for an invoice.
   * 
   * Business Rule: VAT total = sum of (lineSubtotal * vatRate / 100) for all lines
   * 
   * @param invoice - The invoice to calculate VAT total for
   * @returns VAT total amount
   */
  calculateVatTotal(invoice: Invoice): number {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    let vatTotal = 0;

    for (const line of invoice.lines) {
      const lineSubtotal = line.quantity * line.unitPrice;
      const lineVat = lineSubtotal * (line.vatRate / 100);
      vatTotal += lineVat;
    }

    return this.roundToTwoDecimals(vatTotal);
  }

  /**
   * Calculates only the grand total for an invoice.
   * 
   * Business Rule: Grand total = subtotal + VAT total
   * 
   * @param invoice - The invoice to calculate total for
   * @returns Grand total amount
   */
  calculateTotal(invoice: Invoice): number {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    const subtotal = this.calculateSubtotal(invoice);
    const vatTotal = this.calculateVatTotal(invoice);

    return this.roundToTwoDecimals(subtotal + vatTotal);
  }

  /**
   * Calculates totals for multiple invoices.
   * 
   * @param invoices - List of invoices to calculate totals for
   * @returns Map of invoice ID to calculation result
   */
  calculateMultipleInvoiceTotals(invoices: Invoice[]): Map<string, InvoiceCalculationResult> {
    const results = new Map<string, InvoiceCalculationResult>();

    for (const invoice of invoices) {
      const result = this.calculateInvoiceTotals(invoice);
      results.set(invoice.id, result);
    }

    return results;
  }

  /**
   * Calculates the total VAT amount for a specific VAT rate across all lines.
   * 
   * This is useful for grouping VAT by rate (e.g., for reporting).
   * 
   * @param invoice - The invoice to calculate VAT for
   * @param vatRate - VAT rate to filter by
   * @returns Total VAT amount for lines with this VAT rate
   */
  calculateVatTotalByRate(invoice: Invoice, vatRate: number): number {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    if (vatRate < 0 || vatRate > 100) {
      throw new Error('VAT rate must be between 0 and 100');
    }

    let vatTotal = 0;

    for (const line of invoice.lines) {
      if (line.vatRate === vatRate) {
        const lineSubtotal = line.quantity * line.unitPrice;
        const lineVat = lineSubtotal * (line.vatRate / 100);
        vatTotal += lineVat;
      }
    }

    return this.roundToTwoDecimals(vatTotal);
  }

  /**
   * Gets all unique VAT rates used in the invoice.
   * 
   * @param invoice - The invoice to analyze
   * @returns Set of unique VAT rates
   */
  getUniqueVatRates(invoice: Invoice): Set<number> {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    const vatRates = new Set<number>();

    for (const line of invoice.lines) {
      vatRates.add(line.vatRate);
    }

    return vatRates;
  }

  /**
   * Calculates VAT breakdown by rate.
   * 
   * Returns a map of VAT rate to total VAT amount for that rate.
   * 
   * @param invoice - The invoice to analyze
   * @returns Map of VAT rate to total VAT amount
   */
  calculateVatBreakdownByRate(invoice: Invoice): Map<number, number> {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    const breakdown = new Map<number, number>();
    const uniqueRates = this.getUniqueVatRates(invoice);

    for (const vatRate of uniqueRates) {
      const vatTotal = this.calculateVatTotalByRate(invoice, vatRate);
      breakdown.set(vatRate, vatTotal);
    }

    return breakdown;
  }

  /**
   * Calculates the total quantity of items in the invoice.
   * 
   * @param invoice - The invoice to calculate quantity for
   * @returns Total quantity across all lines
   */
  calculateTotalQuantity(invoice: Invoice): number {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    let totalQuantity = 0;

    for (const line of invoice.lines) {
      totalQuantity += line.quantity;
    }

    return totalQuantity;
  }

  /**
   * Calculates the number of lines that reference products.
   * 
   * @param invoice - The invoice to analyze
   * @returns Number of lines with productId
   */
  getProductLineCount(invoice: Invoice): number {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    return invoice.lines.filter(line => line.productId !== undefined).length;
  }

  /**
   * Calculates the number of lines that reference services.
   * 
   * @param invoice - The invoice to analyze
   * @returns Number of lines with serviceId
   */
  getServiceLineCount(invoice: Invoice): number {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    return invoice.lines.filter(line => line.serviceId !== undefined).length;
  }

  /**
   * Calculates the number of lines that don't reference products or services.
   * 
   * @param invoice - The invoice to analyze
   * @returns Number of lines without productId or serviceId
   */
  getOtherLineCount(invoice: Invoice): number {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    return invoice.lines.filter(
      line => line.productId === undefined && line.serviceId === undefined
    ).length;
  }

  /**
   * Validates that invoice totals match the calculated totals.
   * 
   * This is useful for verifying invoice integrity.
   * 
   * @param invoice - The invoice to validate
   * @returns True if invoice totals match calculated totals
   */
  validateInvoiceTotals(invoice: Invoice): boolean {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    const calculated = this.calculateInvoiceTotals(invoice);

    const subtotalMatch = Math.abs(invoice.subtotal - calculated.subtotal) < 0.01;
    const vatTotalMatch = Math.abs(invoice.vatTotal - calculated.vatTotal) < 0.01;
    const totalMatch = Math.abs(invoice.total - calculated.total) < 0.01;

    return subtotalMatch && vatTotalMatch && totalMatch;
  }

  /**
   * Gets the difference between invoice totals and calculated totals.
   * 
   * Useful for identifying discrepancies.
   * 
   * @param invoice - The invoice to compare
   * @returns Object with differences for each total
   */
  getTotalDifferences(invoice: Invoice): {
    subtotalDifference: number;
    vatTotalDifference: number;
    totalDifference: number;
  } {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    const calculated = this.calculateInvoiceTotals(invoice);

    return {
      subtotalDifference: this.roundToTwoDecimals(invoice.subtotal - calculated.subtotal),
      vatTotalDifference: this.roundToTwoDecimals(invoice.vatTotal - calculated.vatTotal),
      totalDifference: this.roundToTwoDecimals(invoice.total - calculated.total),
    };
  }

  /**
   * Rounds a number to two decimal places.
   * 
   * This ensures currency values are properly formatted.
   * 
   * @param value - Value to round
   * @returns Rounded value with 2 decimal places
   */
  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

