# Secrets Management — Patacão Petshop

## Overview

This document defines the secrets management strategy for the Patacão Petshop Management System.

**Production:** AWS Secrets Manager / Azure Key Vault  
**Development:** Environment variables (`.env` files)  
**Principle:** Never commit secrets to version control

---

## Secrets Categories

### 1. Database Credentials

- Database passwords
- Database connection strings
- SSL certificates

### 2. Authentication Secrets

- JWT signing secrets
- Session encryption secrets
- Password reset tokens

### 3. API Keys

- Third-party service API keys
- Email service credentials
- Payment gateway keys (future)

### 4. Cloud Credentials

- AWS access keys
- Azure service principal credentials
- Storage account keys

---

## Secrets Storage

### Development

**Storage:** `.env` files (not committed to Git)

**Files:**
- `.env.development` - Local development
- `.env.test` - Test environment
- `.env.example` - Template (committed)

**Security:**
- Add `.env*` to `.gitignore`
- Never commit actual secrets
- Use weak secrets for development

### Staging/Production

**Storage:** Cloud secrets manager

**Options:**
- **AWS:** Secrets Manager
- **Azure:** Key Vault
- **GCP:** Secret Manager
- **Self-hosted:** HashiCorp Vault

---

## AWS Secrets Manager

### Secret Structure

**Secret Name Format:** `patacao/{environment}/{secret-name}`

**Examples:**
- `patacao/production/database`
- `patacao/production/jwt-secret`
- `patacao/staging/email-credentials`

### Secret Values

**JSON Format:**
```json
{
  "host": "db.example.com",
  "port": 5432,
  "database": "patacao_prod",
  "username": "patacao_user",
  "password": "secure_password"
}
```

### Accessing Secrets

**Using AWS SDK:**
```typescript
import { SecretsManager } from 'aws-sdk';

const secretsManager = new SecretsManager({ region: 'eu-west-1' });

async function getSecret(secretName: string) {
  const result = await secretsManager
    .getSecretValue({ SecretId: secretName })
    .promise();
  return JSON.parse(result.SecretString);
}
```

### IAM Permissions

**Required Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:patacao/*"
    }
  ]
}
```

---

## Azure Key Vault

### Secret Structure

**Secret Name Format:** `{environment}-{secret-name}`

**Examples:**
- `production-database-password`
- `production-jwt-secret`
- `staging-email-password`

### Accessing Secrets

**Using Azure SDK:**
```typescript
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

const credential = new DefaultAzureCredential();
const client = new SecretClient(
  'https://patacao-keyvault.vault.azure.net',
  credential
);

async function getSecret(secretName: string) {
  const secret = await client.getSecret(secretName);
  return secret.value;
}
```

---

## Secret Rotation

### Rotation Policy

**Frequency:** Every 90 days

**Process:**
1. Generate new secret
2. Update in secrets manager
3. Update application configuration
4. Verify application functionality
5. Revoke old secret

### Automated Rotation

**AWS Secrets Manager:**
- Automatic rotation for RDS credentials
- Lambda function for custom rotation
- Rotation schedule configuration

**Manual Rotation:**
- Generate new secret
- Update in secrets manager
- Restart application
- Verify functionality

---

## Secret Access Control

### IAM Roles

**Principle:** Use IAM roles instead of access keys

**Benefits:**
- No long-lived credentials
- Automatic credential rotation
- Fine-grained permissions

**Implementation:**
- ECS Task Roles (AWS)
- Managed Identities (Azure)
- Service Accounts (GCP)

### Access Policies

**Restrict Access:**
- Limit to specific services
- Limit to specific environments
- Audit access logs

---

## Secret Validation

### On Application Start

**Validate:**
- All required secrets present
- Secret formats correct
- Secret values valid

**Example:**
```typescript
async function validateSecrets() {
  const requiredSecrets = [
    'DB_PASSWORD',
    'JWT_SECRET',
    'SESSION_SECRET'
  ];
  
  for (const secretName of requiredSecrets) {
    const value = await getSecret(secretName);
    if (!value || value.length < 32) {
      throw new Error(`Invalid secret: ${secretName}`);
    }
  }
}
```

---

## Secret Security

### Best Practices

1. **Never Log Secrets**
   - Mask secrets in logs
   - Use log sanitization
   - Audit log output

2. **Use Strong Secrets**
   - Minimum 32 characters
   - Random generation
   - Cryptographically secure

3. **Limit Exposure**
   - Secrets only in memory
   - No secrets in environment variables (production)
   - No secrets in code

4. **Monitor Access**
   - Audit secret access
   - Alert on unusual access
   - Review access logs regularly

---

## Emergency Procedures

### Secret Compromise

1. **Immediate Actions**
   - Rotate compromised secret
   - Revoke old secret
   - Audit access logs

2. **Investigation**
   - Identify compromise source
   - Assess impact
   - Document incident

3. **Remediation**
   - Update all affected systems
   - Review security practices
   - Update procedures

---

## Secret Checklist

### Before Deployment

- [ ] All secrets stored in secrets manager
- [ ] IAM roles configured
- [ ] Access policies reviewed
- [ ] Secrets validated
- [ ] Rotation schedule set

### Regular Maintenance

- [ ] Review secret access logs
- [ ] Rotate secrets (90 days)
- [ ] Audit secret usage
- [ ] Update documentation
- [ ] Test rotation procedures

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

