# Portuguese Fiscal Compliance Documentation — Patacão Petshop

## Overview

This document outlines Portuguese fiscal compliance requirements and implementation for the Patacão Petshop Management System.

**Applicable Law:** Portuguese Tax Code (Código do IVA), Invoice Law (Decreto-Lei n.º 28/2019)  
**Territory:** Portugal  
**Currency:** EUR (Euro)  
**Language:** Portuguese (Portugal)

---

## Fiscal Requirements

### 1. NIF (Número de Identificação Fiscal)

#### Company NIF

**Requirement:**
- All companies must have a valid Portuguese NIF
- NIF format: 9 digits
- NIF validation using checksum algorithm

**Implementation:**
- NIF stored in `companies.nif` field
- NIF validation on company creation/update
- NIF displayed on all invoices

**Validation Rules:**
- 9 digits exactly
- Valid checksum (Portuguese NIF algorithm)
- Unique across all companies

**NIF Validation Algorithm:**
```
1. Multiply first 8 digits by weights: 9, 8, 7, 6, 5, 4, 3, 2
2. Sum the products
3. Calculate remainder when divided by 11
4. If remainder < 2, check digit is 0
5. Otherwise, check digit is 11 - remainder
6. Compare with 9th digit
```

### 2. Invoice Numbering

#### Sequential Invoice Numbers

**Requirement:**
- Invoice numbers must be sequential
- No gaps in numbering (business rule dependent)
- Unique per company/store
- Format: Numeric or alphanumeric (configurable)

**Implementation:**
- Invoice numbers generated automatically
- Sequential numbering per company/store
- Stored in `invoices.invoice_number` field
- Unique constraint enforced

**Invoice Number Format:**
- Default: Numeric (1, 2, 3, ...)
- Configurable: Prefix + number (INV-001, INV-002, ...)
- Configurable: Year prefix (2025/001, 2025/002, ...)

**Generation Rules:**
- Atomic generation (prevent conflicts)
- Database-level uniqueness
- Cannot be modified after issuance

### 3. Invoice Content Requirements

#### Mandatory Fields

**Company Information:**
- Company name
- Company NIF
- Company address
- Tax regime

**Invoice Information:**
- Invoice number
- Invoice date (issued_at)
- Invoice status (draft, issued, paid, cancelled)

**Line Items:**
- Description
- Quantity
- Unit price
- VAT rate
- Line total (incl. VAT)

**Totals:**
- Subtotal (excl. VAT)
- VAT total
- Total (incl. VAT)

**Customer Information (if applicable):**
- Customer name
- Customer NIF (if available)
- Customer address (if available)

#### Optional Fields

- Payment method
- Payment date
- External reference
- Notes

### 4. VAT (IVA) Requirements

#### VAT Rates

**Standard Rates:**
- Standard rate: 23% (most goods and services)
- Intermediate rate: 13% (some services)
- Reduced rate: 6% (essential goods, some services)
- Zero rate: 0% (exports, some services)

**Implementation:**
- VAT rates stored per product/service
- Default VAT rate: 23%
- Configurable per company (`companies.default_vat_rate`)

#### VAT Calculation

**Calculation:**
```
Subtotal = Sum of (quantity × unit_price) for all lines
VAT Total = Sum of (line_total × vat_rate / (100 + vat_rate)) for all lines
Total = Subtotal + VAT Total
```

**Storage:**
- `invoices.subtotal` - Total excl. VAT
- `invoices.vat_total` - Total VAT
- `invoices.total` - Total incl. VAT

#### VAT Reporting

**Requirements:**
- Monthly VAT declarations
- Annual VAT summary
- Export capabilities for accounting software

**Implementation:**
- Financial export functionality
- CSV/JSON export formats
- Period-based exports (monthly, quarterly, annual)

### 5. Invoice Status and Lifecycle

#### Invoice Statuses

1. **Draft** (`draft`)
   - Invoice created but not issued
   - Can be modified
   - Not legally valid

2. **Issued** (`issued`)
   - Invoice issued and legally valid
   - Cannot be modified
   - Sequential number assigned
   - Fiscal document

3. **Paid** (`paid`)
   - Payment recorded
   - Payment method and date recorded
   - Fiscal document

4. **Cancelled** (`cancelled`)
   - Invoice voided
   - Reason required
   - Cannot be modified
   - Fiscal document (cancelled)

5. **Refunded** (`refunded`)
   - Credit note issued
   - Original invoice referenced
   - Fiscal document

#### Invoice Lifecycle Rules

- **Draft → Issued:** Cannot be reversed
- **Issued → Paid:** Payment recording
- **Issued → Cancelled:** Voiding (requires reason)
- **Issued → Refunded:** Credit note creation

### 6. Credit Notes

#### Credit Note Requirements

**Mandatory Fields:**
- Credit note ID
- Original invoice reference
- Issue date
- Reason for credit
- Credit amount

**Implementation:**
- Credit notes stored in `credit_notes` table
- Linked to original invoice
- Amount cannot exceed invoice outstanding amount

**Credit Note Rules:**
- Only for issued or paid invoices
- Reason required
- Amount validation (cannot exceed outstanding)
- Manager/Accountant role required

### 7. Invoice Retention

#### Retention Period

**Requirement:**
- Invoices must be retained for 10 years
- Digital storage acceptable
- Must be accessible for tax audits

**Implementation:**
- Invoices stored in database
- Backup and archival procedures
- Export capabilities for long-term storage

### 8. Financial Exports

#### Export Requirements

**Purpose:**
- Accounting software integration
- Tax declaration support
- Audit trail

**Export Formats:**
- CSV (comma-separated values)
- JSON (structured data)
- SFTP upload (optional)

**Export Content:**
- Invoice data
- Line items
- VAT breakdown
- Payment information
- Credit notes

**Export Periods:**
- Monthly exports
- Quarterly exports
- Annual exports
- Custom date ranges

### 9. Tax Regime

#### Tax Regime Types

**Common Regimes:**
- Simplified regime (Regime Simplificado)
- Normal regime (Regime Normal)
- Exempt regime (Isento)

**Implementation:**
- Tax regime stored in `companies.tax_regime`
- Affects invoice requirements
- Affects VAT reporting

### 10. E-Invoicing (Future)

#### SAF-T (Standard Audit File for Tax)

**Requirement:**
- SAF-T format for tax audits
- XML format
- Period-based exports

**Implementation:**
- Future feature
- SAF-T export functionality
- XML generation

---

## Implementation Details

### Invoice Number Generation

```typescript
// Pseudo-code for invoice number generation
async function generateInvoiceNumber(
  companyId: UUID,
  storeId: UUID
): Promise<string> {
  // Get last invoice number for company/store
  const lastInvoice = await invoiceRepository.findLastByCompanyAndStore(
    companyId,
    storeId
  );
  
  // Generate next sequential number
  const nextNumber = lastInvoice 
    ? parseInt(lastInvoice.invoice_number) + 1
    : 1;
  
  // Format with prefix if configured
  const prefix = await getInvoicePrefix(companyId, storeId);
  return prefix ? `${prefix}-${nextNumber}` : nextNumber.toString();
}
```

### NIF Validation

```typescript
// Pseudo-code for NIF validation
function validateNIF(nif: string): boolean {
  // Check format (9 digits)
  if (!/^\d{9}$/.test(nif)) {
    return false;
  }
  
  // Extract digits
  const digits = nif.split('').map(Number);
  
  // Calculate check digit
  const weights = [9, 8, 7, 6, 5, 4, 3, 2];
  const sum = digits.slice(0, 8).reduce(
    (acc, digit, index) => acc + digit * weights[index],
    0
  );
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? 0 : 11 - remainder;
  
  // Validate check digit
  return checkDigit === digits[8];
}
```

### VAT Calculation

```typescript
// Pseudo-code for VAT calculation
function calculateVAT(
  lines: InvoiceLine[]
): { subtotal: number; vatTotal: number; total: number } {
  let subtotal = 0;
  let vatTotal = 0;
  
  for (const line of lines) {
    const lineSubtotal = line.quantity * line.unit_price;
    const lineVAT = lineSubtotal * (line.vat_rate / 100);
    const lineTotal = lineSubtotal + lineVAT;
    
    subtotal += lineSubtotal;
    vatTotal += lineVAT;
  }
  
  const total = subtotal + vatTotal;
  
  return {
    subtotal: round(subtotal, 2),
    vatTotal: round(vatTotal, 2),
    total: round(total, 2)
  };
}
```

---

## Compliance Checklist

### Invoice Requirements

- [ ] Sequential invoice numbering implemented
- [ ] NIF validation implemented
- [ ] Mandatory invoice fields present
- [ ] VAT calculation correct
- [ ] Invoice status lifecycle enforced
- [ ] Credit note functionality implemented

### Data Retention

- [ ] 10-year retention policy implemented
- [ ] Backup and archival procedures in place
- [ ] Export capabilities available

### Reporting

- [ ] Financial export functionality implemented
- [ ] CSV/JSON export formats available
- [ ] Period-based exports supported
- [ ] SFTP upload capability (optional)

### Validation

- [ ] NIF format validation
- [ ] NIF checksum validation
- [ ] Invoice number uniqueness enforced
- [ ] VAT rate validation
- [ ] Invoice amount validation

---

## Regulatory References

### Portuguese Legislation

- **Decreto-Lei n.º 28/2019** - Invoice requirements
- **Código do IVA** - VAT regulations
- **Portaria n.º 363/2010** - SAF-T requirements

### Tax Authority

**Autoridade Tributária e Aduaneira (AT)**  
**Website:** https://www.portaldasfinancas.gov.pt  
**Contact:** Available on portal

---

## Future Compliance Requirements

### E-Invoicing

- **SAF-T Format:** Standard Audit File for Tax
- **XML Export:** Period-based SAF-T exports
- **Real-time Reporting:** Future requirement (monitor for updates)

### Digital Signature

- **Electronic Signature:** For digital invoices
- **Certification:** Qualified electronic signature
- **Storage:** Long-term storage with signature validation

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team  
**Review Frequency:** Annual or when regulations change

