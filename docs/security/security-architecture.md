# Security Architecture — Patacão Petshop

## Overview

This document outlines the security architecture, measures, and best practices for the Patacão Petshop Management System.

**Security Principles:** Defense in depth, least privilege, secure by default  
**Compliance:** GDPR, Portuguese fiscal requirements

---

## Security Layers

### 1. Network Security

#### Firewall Rules

- **Inbound:** Only HTTPS (443) and SSH (22) allowed
- **Outbound:** Whitelist required services only
- **Database:** Private subnet, no public access
- **Redis:** Private subnet, no public access

#### Network Segmentation

- **Public Subnet:** Load balancer, API servers
- **Private Subnet:** Application servers, databases
- **Isolated Subnet:** Database, Redis (no internet access)

#### DDoS Protection

- Cloud-based DDoS protection (AWS Shield, Azure DDoS Protection)
- Rate limiting at application level
- IP-based blocking for malicious traffic

### 2. Application Security

#### Authentication

- **JWT Tokens:** Short-lived access tokens (1 hour)
- **Refresh Tokens:** Long-lived (7 days), revocable
- **Password Hashing:** Bcrypt/Argon2 with salt
- **Session Management:** Secure session storage in Redis

#### Authorization

- **RBAC:** Role-based access control
- **Permission Checks:** At API and use case level
- **Least Privilege:** Minimum necessary permissions

#### Input Validation

- **DTO Validation:** Request validation using DTOs
- **SQL Injection Prevention:** Parameterized queries, ORM
- **XSS Prevention:** Input sanitization, output encoding
- **CSRF Protection:** CSRF tokens for state-changing operations

### 3. Data Security

#### Encryption at Rest

- **Database:** Encrypted storage (AES-256)
- **Backups:** Encrypted backups
- **File Storage:** Encrypted S3/Azure Blob storage

#### Encryption in Transit

- **HTTPS:** TLS 1.2+ for all API endpoints
- **Database:** SSL/TLS connections
- **Redis:** TLS connections (production)

#### Sensitive Data

- **Passwords:** Hashed, never stored in plain text
- **Payment Data:** Not stored (manual entry only)
- **Medical Notes:** Additional encryption layer
- **Personal Data:** Encrypted at rest and in transit

### 4. Infrastructure Security

#### Container Security

- **Base Images:** Official, minimal images
- **Image Scanning:** Vulnerability scanning
- **Non-root User:** Containers run as non-root
- **Secrets:** Never in container images

#### Cloud Security

- **IAM Roles:** Least privilege access
- **Security Groups:** Restrictive firewall rules
- **VPC:** Private network isolation
- **Secrets Manager:** Secure secret storage

---

## Authentication Flow

### Login Flow

1. **User submits credentials** (email/password)
2. **Server validates credentials**
3. **Server generates JWT tokens**
   - Access token (short-lived)
   - Refresh token (long-lived)
4. **Server stores session in Redis**
5. **Server returns tokens to client**
6. **Client stores tokens securely**

### Token Refresh Flow

1. **Client sends refresh token**
2. **Server validates refresh token**
3. **Server checks session validity**
4. **Server generates new access token**
5. **Server returns new access token**

### Logout Flow

1. **Client sends logout request**
2. **Server revokes session in Redis**
3. **Server invalidates refresh token**
4. **Client removes tokens**

---

## Authorization Model

### Role-Based Access Control (RBAC)

**Roles:**
- Owner
- Manager
- Staff
- Accountant
- Veterinarian

**Permissions:**
- Resource-based permissions
- Action-based permissions
- Context-based permissions (store access)

### Permission Checks

**Layers:**
1. **API Middleware:** Initial permission check
2. **Use Case:** Business logic permission check
3. **Repository:** Data access permission check

---

## Security Headers

### HTTP Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## Rate Limiting

### Rate Limit Strategy

- **Authentication:** 5 requests per 15 minutes per IP
- **API Endpoints:** 100 requests per 15 minutes per user
- **Password Reset:** 3 requests per hour per email

### Implementation

- **Redis-based:** Distributed rate limiting
- **IP-based:** Per IP address
- **User-based:** Per authenticated user

---

## Security Monitoring

### Logging

- **Authentication Events:** Login, logout, failed attempts
- **Authorization Events:** Permission denials
- **Security Events:** Suspicious activity, attacks
- **Audit Logs:** All data access and modifications

### Alerting

- **Failed Login Attempts:** Alert after 5 failures
- **Permission Denials:** Alert on repeated denials
- **Suspicious Activity:** Alert on unusual patterns
- **Security Breaches:** Immediate alert

---

## Vulnerability Management

### Vulnerability Scanning

- **Dependencies:** Regular dependency scanning
- **Container Images:** Image vulnerability scanning
- **Code:** Static code analysis
- **Infrastructure:** Infrastructure scanning

### Patching

- **Critical:** Patch within 24 hours
- **High:** Patch within 7 days
- **Medium:** Patch within 30 days
- **Low:** Patch in next release

---

## Incident Response

### Security Incident Types

1. **Data Breach**
2. **Unauthorized Access**
3. **DDoS Attack**
4. **Malware Infection**
5. **Credential Compromise**

### Response Procedure

1. **Detection:** Identify security incident
2. **Containment:** Isolate affected systems
3. **Investigation:** Determine scope and impact
4. **Remediation:** Fix vulnerabilities
5. **Recovery:** Restore normal operations
6. **Documentation:** Document incident and response

---

## Security Checklist

### Pre-Deployment

- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Authentication/authorization tested
- [ ] Encryption configured
- [ ] Secrets management configured
- [ ] Security monitoring enabled

### Regular Maintenance

- [ ] Dependency updates reviewed
- [ ] Security patches applied
- [ ] Access logs reviewed
- [ ] Security scans performed
- [ ] Incident response tested
- [ ] Security documentation updated

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

