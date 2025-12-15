# GDPR Compliance Documentation — Patacão Petshop

## Overview

This document outlines GDPR (General Data Protection Regulation) compliance measures implemented in the Patacão Petshop Management System.

**Regulation:** EU GDPR (Regulation (EU) 2016/679)  
**Applicable From:** May 25, 2018  
**Territory:** European Union, including Portugal

---

## GDPR Principles

### 1. Lawfulness, Fairness, and Transparency
- Personal data processed lawfully, fairly, and transparently
- Clear privacy notices and consent mechanisms

### 2. Purpose Limitation
- Personal data collected for specified, explicit, and legitimate purposes
- Not processed in a manner incompatible with those purposes

### 3. Data Minimization
- Personal data adequate, relevant, and limited to what is necessary
- Only collect data required for business operations

### 4. Accuracy
- Personal data accurate and kept up to date
- Inaccurate data erased or rectified without delay

### 5. Storage Limitation
- Personal data kept in a form that permits identification for no longer than necessary
- Data retention policies implemented

### 6. Integrity and Confidentiality
- Personal data processed securely
- Protection against unauthorized access, loss, or destruction

### 7. Accountability
- Data controller responsible for and able to demonstrate compliance
- Documentation of processing activities

---

## Personal Data Inventory

### Data Categories

#### Customer Data
- **Full Name** (required)
- **Email Address** (optional)
- **Phone Number** (optional)
- **Address** (optional)
- **Marketing Consent** (consent flag)
- **Reminders Consent** (consent flag)

**Legal Basis:** Contract performance, legitimate interest (service delivery)

**Retention:** 7 years after last transaction (fiscal requirement), or until consent withdrawal

#### Pet Data
- **Pet Name** (required)
- **Species** (required)
- **Breed** (optional)
- **Date of Birth** (optional)
- **Microchip ID** (optional)
- **Medical Notes** (optional, sensitive data)
- **Vaccination Records** (optional, sensitive data)

**Legal Basis:** Contract performance, legitimate interest (service delivery)

**Retention:** 7 years after last appointment, or until customer deletion request

#### User/Staff Data
- **Full Name** (required)
- **Email Address** (required)
- **Phone Number** (optional)
- **Username** (optional)
- **Password Hash** (required, encrypted)
- **Working Hours** (optional)
- **Service Skills** (optional)

**Legal Basis:** Contract performance, legitimate interest (employment)

**Retention:** While user account is active, 7 years after termination (employment records)

#### Financial Data
- **Invoice Data** (required for fiscal compliance)
- **Transaction Data** (required for fiscal compliance)
- **Payment Information** (manual entry, no card data stored)

**Legal Basis:** Legal obligation (fiscal compliance)

**Retention:** 10 years (Portuguese fiscal requirement)

#### Audit Logs
- **User Actions** (required for security and compliance)
- **Entity Changes** (required for audit trail)
- **IP Addresses** (required for security)

**Legal Basis:** Legitimate interest (security, fraud prevention)

**Retention:** 1 year for operational logs, 7 years for financial audit logs

---

## Data Subject Rights

### 1. Right to Information (Articles 13-14)

**Implementation:**
- Privacy policy available on website
- Clear information about data processing
- Contact information for data protection officer

**Privacy Policy Must Include:**
- Identity of data controller
- Purpose of processing
- Legal basis for processing
- Data retention periods
- Data subject rights
- Right to lodge complaint with supervisory authority

### 2. Right of Access (Article 15)

**Implementation:**
- Data subjects can request access to their personal data
- System provides data export functionality
- Response within 30 days

**Data Export Includes:**
- Customer profile data
- Pet records
- Appointment history
- Invoice history
- Consent records

**API Endpoint:** `GET /api/v1/customers/{id}/data-export`

### 3. Right to Rectification (Article 16)

**Implementation:**
- Data subjects can request correction of inaccurate data
- System allows data updates through API and UI
- Changes logged in audit trail

**API Endpoint:** `PUT /api/v1/customers/{id}`

### 4. Right to Erasure ("Right to be Forgotten") (Article 17)

**Implementation:**
- Data subjects can request deletion of personal data
- System implements soft delete (archival) for customers
- Hard delete only when no legal obligation to retain

**Conditions for Erasure:**
- Data no longer necessary for original purpose
- Consent withdrawn
- Objection to processing
- Unlawful processing

**Exceptions:**
- Legal obligation to retain (fiscal records: 10 years)
- Legitimate interest (fraud prevention)
- Legal claims

**API Endpoint:** `DELETE /api/v1/customers/{id}`

**Process:**
1. Verify no legal obligation to retain
2. Archive customer record (soft delete)
3. Anonymize personal data in related records
4. Retain financial records as required by law

### 5. Right to Restrict Processing (Article 18)

**Implementation:**
- Data subjects can request restriction of processing
- System flags records for restricted processing
- Processing limited to storage only

**API Endpoint:** `POST /api/v1/customers/{id}/restrict-processing`

### 6. Right to Data Portability (Article 20)

**Implementation:**
- Data subjects can receive personal data in structured format
- Data export in JSON or CSV format
- Data can be transferred to another service

**API Endpoint:** `GET /api/v1/customers/{id}/data-export`

**Export Format:**
```json
{
  "customer": {
    "id": "uuid",
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+351912345678",
    "address": {...},
    "consent_marketing": true,
    "consent_reminders": true
  },
  "pets": [...],
  "appointments": [...],
  "invoices": [...]
}
```

### 7. Right to Object (Article 21)

**Implementation:**
- Data subjects can object to processing based on legitimate interest
- System respects objection and stops processing
- Marketing communications stopped immediately

**API Endpoint:** `POST /api/v1/customers/{id}/object-processing`

### 8. Rights Related to Automated Decision-Making (Article 22)

**Implementation:**
- No automated decision-making or profiling
- All decisions involve human review

---

## Consent Management

### Marketing Consent

**Field:** `customers.consent_marketing` (BOOLEAN)

**Default:** `FALSE` (opt-out by default)

**Requirements:**
- Explicit consent required
- Consent can be withdrawn at any time
- Consent withdrawal logged
- Marketing communications stopped immediately

**Implementation:**
- Consent recorded with timestamp
- Consent withdrawal recorded
- Marketing list updated automatically

### Reminders Consent

**Field:** `customers.consent_reminders` (BOOLEAN)

**Default:** `TRUE` (opt-in by default, considered essential service)

**Requirements:**
- Consent required for appointment reminders
- Consent can be withdrawn
- Reminders stopped if consent withdrawn

**Implementation:**
- Consent checked before sending reminders
- Reminders only sent if `consent_reminders = TRUE`

---

## Data Retention Policies

### Customer Data

| Data Type | Retention Period | Legal Basis |
|-----------|------------------|-------------|
| Customer Profile | 7 years after last transaction | Fiscal compliance |
| Pet Records | 7 years after last appointment | Service delivery |
| Marketing Consent | Until withdrawal | Consent |
| Reminders Consent | Until withdrawal | Consent |

### Financial Data

| Data Type | Retention Period | Legal Basis |
|-----------|------------------|-------------|
| Invoices | 10 years | Portuguese fiscal law |
| Transactions | 10 years | Portuguese fiscal law |
| Credit Notes | 10 years | Portuguese fiscal law |
| Financial Exports | 10 years | Portuguese fiscal law |

### Audit Logs

| Data Type | Retention Period | Legal Basis |
|-----------|------------------|-------------|
| Operational Logs | 1 year | Security, troubleshooting |
| Financial Audit Logs | 7 years | Fiscal compliance |
| Security Logs | 1 year | Security, fraud prevention |

### User/Staff Data

| Data Type | Retention Period | Legal Basis |
|-----------|------------------|-------------|
| Active User Accounts | While active | Employment contract |
| Inactive User Accounts | 7 years after termination | Employment records |

---

## Data Security Measures

### Encryption

- **Data at Rest:** Database encryption (AES-256)
- **Data in Transit:** TLS 1.2+ for all connections
- **Password Storage:** Bcrypt/Argon2 hashing
- **Sensitive Fields:** Additional encryption for medical notes

### Access Control

- **Role-Based Access Control (RBAC):** Users have minimum necessary permissions
- **Authentication:** Strong password requirements, session management
- **Authorization:** Permission checks on all data access
- **Audit Logging:** All data access logged

### Network Security

- **HTTPS:** All API endpoints use HTTPS
- **VPN:** Database access through private network
- **Firewall:** Network-level access controls
- **DDoS Protection:** Cloud-based DDoS protection

### Backup Security

- **Encrypted Backups:** All backups encrypted
- **Access Control:** Backup access restricted
- **Retention:** Backup retention aligned with data retention policies

---

## Data Breach Procedures

### Breach Detection

- **Monitoring:** Automated monitoring for suspicious activity
- **Alerts:** Immediate alerts for potential breaches
- **Logging:** Comprehensive security logging

### Breach Response

1. **Containment:** Immediate containment of breach
2. **Assessment:** Assess scope and impact
3. **Notification:** Notify supervisory authority within 72 hours
4. **Data Subjects:** Notify affected data subjects if high risk
5. **Documentation:** Document breach and response
6. **Remediation:** Implement measures to prevent recurrence

### Notification Requirements

**Supervisory Authority (CNPD - Portugal):**
- Within 72 hours of becoming aware
- Include: nature of breach, categories of data, number of data subjects, consequences, measures taken

**Data Subjects:**
- Without undue delay if high risk to rights and freedoms
- Clear and plain language
- Include: nature of breach, contact information, measures taken

---

## Data Processing Records

### Processing Activities Log

**Maintained for:**
- All personal data processing activities
- Legal basis for processing
- Data categories and data subjects
- Recipients of data
- Retention periods
- Security measures

### Third-Party Processors

**Processors:**
- Cloud hosting provider (AWS/Azure)
- Email service provider
- Payment processor (future)
- Analytics provider (if applicable)

**Requirements:**
- Data Processing Agreements (DPAs) in place
- Processors comply with GDPR
- Sub-processors approved
- Regular audits of processors

---

## Data Protection Impact Assessment (DPIA)

### When Required

- Systematic and extensive evaluation of personal aspects
- Large-scale processing of sensitive data
- Systematic monitoring of publicly accessible areas

### DPIA Process

1. **Description:** Describe processing operations
2. **Necessity:** Assess necessity and proportionality
3. **Risks:** Identify risks to data subjects
4. **Measures:** Identify measures to address risks
5. **Documentation:** Document assessment

### High-Risk Processing

- Medical notes (pet health data)
- Financial transaction data
- Large-scale customer data processing

---

## Data Subject Request Handling

### Request Process

1. **Receipt:** Receive and log request
2. **Verification:** Verify identity of requester
3. **Processing:** Process request within 30 days
4. **Response:** Provide response or explanation
5. **Documentation:** Document request and response

### Request Types

- Access request
- Rectification request
- Erasure request
- Portability request
- Objection request
- Restriction request

### Response Time

- **Standard:** 30 days from receipt
- **Extension:** Up to 60 days for complex requests (with notification)

---

## Privacy by Design and Default

### Privacy by Design

- Data protection considered from system design
- Minimize data collection
- Default privacy settings
- Data minimization principles

### Privacy by Default

- Default settings protect privacy
- Opt-in for marketing (not opt-out)
- Minimum necessary data collection
- Maximum privacy protection

---

## Training and Awareness

### Staff Training

- GDPR awareness training
- Data handling procedures
- Breach response procedures
- Regular updates on GDPR requirements

### Documentation

- Privacy policy
- Data processing procedures
- Breach response procedures
- Data subject request procedures

---

## Compliance Monitoring

### Regular Audits

- Annual GDPR compliance audit
- Review of data processing activities
- Review of security measures
- Review of data retention policies

### Metrics

- Number of data subject requests
- Response times
- Breach incidents
- Consent rates
- Data retention compliance

---

## Contact Information

### Data Protection Officer (DPO)

**Email:** dpo@patacao.com  
**Address:** [Company Address]  
**Phone:** [Phone Number]

### Supervisory Authority

**CNPD - Comissão Nacional de Proteção de Dados**  
**Website:** https://www.cnpd.pt  
**Email:** geral@cnpd.pt

---

## Compliance Checklist

### Data Protection

- [ ] Privacy policy published
- [ ] Consent mechanisms implemented
- [ ] Data retention policies defined
- [ ] Data security measures implemented
- [ ] Access controls enforced

### Data Subject Rights

- [ ] Right to access implemented
- [ ] Right to rectification implemented
- [ ] Right to erasure implemented
- [ ] Right to portability implemented
- [ ] Right to object implemented

### Procedures

- [ ] Data breach procedures documented
- [ ] Data subject request procedures documented
- [ ] Staff training completed
- [ ] Processing records maintained
- [ ] DPAs with processors signed

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team  
**Review Frequency:** Annual

