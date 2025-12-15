# Deployment Guide — Patacão Petshop

## Overview

This document provides step-by-step procedures for deploying the Patacão Petshop application to various environments (development, staging, production).

**Architecture:** Clean/Hexagonal Architecture  
**Platform:** Node.js + PostgreSQL + Redis  
**Deployment:** Docker containers, cloud-first approach

---

## Prerequisites

### Required Tools

- Docker 24.x+
- Docker Compose 2.x+
- Node.js 20.x LTS
- PostgreSQL 15.x (or managed service)
- Redis 7.x (or managed service)
- Git 2.42.x+
- AWS CLI / Azure CLI (for cloud deployment)

### Required Access

- Database access credentials
- Cloud platform access (AWS/Azure/GCP)
- Container registry access
- Secrets management access

---

## Environment Configuration

### Environment Variables

Create `.env` files for each environment:

#### Development (.env.development)

```env
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Firebase
FIREBASE_PROJECT_ID=patacao-dev
FIREBASE_SERVICE_ACCOUNT_PATH=
FIREBASE_SERVICE_ACCOUNT_KEY=
USE_FIREBASE_EMULATOR=true
FIREBASE_EMULATOR_HOST=localhost:8080

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=dev_secret_key_change_in_production
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Session
SESSION_SECRET=dev_session_secret
SESSION_MAX_AGE=86400000

# Email (optional for dev)
EMAIL_PROVIDER=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=

# File Storage
STORAGE_TYPE=local
STORAGE_PATH=./uploads

# Logging
LOG_LEVEL=debug
LOG_FORMAT=pretty
```

#### Production (.env.production)

```env
# Application
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Firebase (from secrets manager)
FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
FIREBASE_SERVICE_ACCOUNT_KEY=${FIREBASE_SERVICE_ACCOUNT_KEY}
USE_FIREBASE_EMULATOR=false

# Redis (from secrets manager)
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# JWT (from secrets manager)
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# Session
SESSION_SECRET=${SESSION_SECRET}
SESSION_MAX_AGE=86400000

# Email
EMAIL_PROVIDER=smtp
EMAIL_HOST=${EMAIL_HOST}
EMAIL_PORT=587
EMAIL_USER=${EMAIL_USER}
EMAIL_PASSWORD=${EMAIL_PASSWORD}

# File Storage
STORAGE_TYPE=s3
AWS_REGION=eu-west-1
AWS_S3_BUCKET=patacao-uploads
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
SENTRY_DSN=${SENTRY_DSN}
```

---

## Local Development Deployment

### Using Docker Compose

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-org/patacao.git
   cd patacao
   ```

2. **Create Environment File**
   ```bash
   cp .env.example .env.development
   # Edit .env.development with your settings
   ```

3. **Start Services**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

4. **Deploy Firestore Rules (if needed)**
   ```bash
   docker-compose -f docker-compose.dev.yml exec app npm run firebase:deploy
   ```

5. **Seed Database (Optional)**
   ```bash
   docker-compose -f docker-compose.dev.yml exec app npm run seed
   ```

6. **Verify Deployment**
   ```bash
   curl http://localhost:3000/health
   ```

### Docker Compose Configuration

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    env_file:
      - .env.development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=patacao_dev
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=dev_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## Staging Deployment

### AWS ECS Deployment

1. **Build Docker Image**
   ```bash
   docker build -t patacao:staging .
   docker tag patacao:staging 123456789.dkr.ecr.eu-west-1.amazonaws.com/patacao:staging
   ```

2. **Push to ECR**
   ```bash
   aws ecr get-login-password --region eu-west-1 | \
     docker login --username AWS --password-stdin 123456789.dkr.ecr.eu-west-1.amazonaws.com
   docker push 123456789.dkr.ecr.eu-west-1.amazonaws.com/patacao:staging
   ```

3. **Update ECS Service**
   ```bash
   aws ecs update-service \
     --cluster patacao-staging \
     --service patacao-api \
     --force-new-deployment
   ```

4. **Deploy Firestore Rules**
   ```bash
   # Deploy Firestore security rules and indexes
   firebase deploy --only firestore:rules,firestore:indexes
   ```

5. **Verify Deployment**
   ```bash
   curl https://staging-api.patacao.com/health
   ```

### Azure Container Instances Deployment

1. **Build and Push Image**
   ```bash
   az acr build --registry patacao --image patacao:staging .
   ```

2. **Deploy Container**
   ```bash
   az container create \
     --resource-group patacao-staging \
     --name patacao-api \
     --image patacao.azurecr.io/patacao:staging \
     --environment-variables @.env.staging \
     --dns-name-label patacao-staging-api
   ```

3. **Deploy Firestore Rules**
   ```bash
   # Deploy Firestore security rules and indexes
   firebase deploy --only firestore:rules,firestore:indexes
   ```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Firestore backup completed (if needed)
- [ ] Firestore rules and indexes tested on staging
- [ ] Environment variables configured
- [ ] Secrets stored in secrets manager (Firebase service account)
- [ ] SSL certificates configured
- [ ] Monitoring and alerting configured
- [ ] Rollback plan prepared
- [ ] Deployment window scheduled

### Deployment Steps

1. **Create Deployment Branch**
   ```bash
   git checkout -b release/v1.0.0
   git push origin release/v1.0.0
   ```

2. **Build Production Image**
   ```bash
   docker build -t patacao:1.0.0 -f Dockerfile.prod .
   docker tag patacao:1.0.0 123456789.dkr.ecr.eu-west-1.amazonaws.com/patacao:1.0.0
   docker tag patacao:1.0.0 123456789.dkr.ecr.eu-west-1.amazonaws.com/patacao:latest
   ```

3. **Push to Container Registry**
   ```bash
   docker push 123456789.dkr.ecr.eu-west-1.amazonaws.com/patacao:1.0.0
   docker push 123456789.dkr.ecr.eu-west-1.amazonaws.com/patacao:latest
   ```

4. **Deploy Firestore Rules and Indexes**
   ```bash
   # Deploy Firestore security rules and indexes
   firebase deploy --only firestore:rules,firestore:indexes --project patacao-production
   ```

5. **Deploy Application**
   ```bash
   # Blue-Green Deployment
   aws ecs update-service \
     --cluster patacao-production \
     --service patacao-api \
     --task-definition patacao-api:1.0.0 \
     --desired-count 2
   ```

6. **Health Check**
   ```bash
   # Wait for service to stabilize
   aws ecs wait services-stable \
     --cluster patacao-production \
     --services patacao-api

   # Verify health endpoint
   curl https://api.patacao.com/health
   ```

7. **Smoke Tests**
   ```bash
   # Run automated smoke tests
   npm run test:smoke -- --env=production
   ```

8. **Monitor Deployment**
   - Check application logs
   - Monitor error rates
   - Verify database connections
   - Check Redis connectivity

### Blue-Green Deployment

1. **Deploy to Green Environment**
   ```bash
   aws ecs update-service \
     --cluster patacao-production-green \
     --service patacao-api \
     --task-definition patacao-api:1.0.0
   ```

2. **Run Smoke Tests on Green**
   ```bash
   curl https://green-api.patacao.com/health
   npm run test:smoke -- --base-url=https://green-api.patacao.com
   ```

3. **Switch Traffic to Green**
   ```bash
   # Update load balancer target group
   aws elbv2 modify-listener \
     --listener-arn arn:aws:elasticloadbalancing:... \
     --default-actions Type=forward,TargetGroupArn=green-target-group-arn
   ```

4. **Monitor Green Environment**
   - Monitor for 15-30 minutes
   - Check error rates
   - Verify functionality

5. **Decommission Blue Environment (if successful)**
   ```bash
   aws ecs update-service \
     --cluster patacao-production-blue \
     --service patacao-api \
     --desired-count 0
   ```

---

## Database Migration Deployment

### Firestore Rules Deployment Strategy

1. **Pre-Deployment Backup**
   ```bash
   # Export Firestore data (if needed)
   gcloud firestore export gs://patacao-backups/backup-$(date +%Y%m%d)
   ```

2. **Deploy Rules and Indexes**
   ```bash
   # Deploy Firestore security rules
   firebase deploy --only firestore:rules --project patacao-production

   # Deploy Firestore indexes
   firebase deploy --only firestore:indexes --project patacao-production
   ```

3. **Verify Deployment**
   ```bash
   # Test rules in Firebase Console
   # Verify indexes are building
   # Monitor application after deployment
   ```

4. **Rollback (if needed)**
   ```bash
   # Revert to previous rules version
   firebase deploy --only firestore:rules --project patacao-production --force
   ```

### Firestore Best Practices

- Test rules thoroughly in staging
- Deploy during low-traffic periods
- Monitor index build status
- Keep Firestore backups
- Use Firebase Console for rule testing

---

## Rollback Procedures

### Application Rollback

1. **Identify Last Stable Version**
   ```bash
   git log --oneline --decorate
   ```

2. **Revert to Previous Version**
   ```bash
   # Update ECS service to previous task definition
   aws ecs update-service \
     --cluster patacao-production \
     --service patacao-api \
     --task-definition patacao-api:0.9.0 \
     --force-new-deployment
   ```

3. **Verify Rollback**
   ```bash
   curl https://api.patacao.com/health
   ```

### Firestore Rules Rollback

1. **Identify Previous Rules Version**
   ```bash
   # Check Firebase Console for rules history
   # Or use Firebase CLI to view previous versions
   ```

2. **Rollback Rules**
   ```bash
   # Deploy previous rules version
   firebase deploy --only firestore:rules --project patacao-production --force
   ```

3. **Restore from Backup (if needed)**
   ```bash
   # Import Firestore data from backup
   gcloud firestore import gs://patacao-backups/backup-20250115
   ```

---

## Health Checks

### Application Health Endpoint

```typescript
// GET /health
{
  "status": "healthy",
  "timestamp": "2025-01-15T12:00:00Z",
  "version": "1.0.0",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "disk": "healthy"
  }
}
```

### Health Check Configuration

```yaml
# ECS Task Definition
healthCheck:
  command:
    - CMD-SHELL
    - "curl -f http://localhost:3000/health || exit 1"
  interval: 30
  timeout: 5
  retries: 3
  startPeriod: 60
```

---

## Monitoring and Logging

### Application Logs

- **Local:** Console output
- **Staging/Production:** CloudWatch Logs, Azure Monitor, or ELK Stack

### Metrics

- Application performance metrics
- Database connection pool metrics
- Redis connection metrics
- Error rates and response times

### Alerts

- Deployment failures
- Health check failures
- High error rates
- Database connection failures

---

## Security Considerations

### Secrets Management

- Store secrets in AWS Secrets Manager / Azure Key Vault
- Never commit secrets to Git
- Rotate secrets regularly
- Use IAM roles for service access

### SSL/TLS

- Use HTTPS for all API endpoints
- Configure SSL certificates (Let's Encrypt or ACM)
- Enable TLS 1.2+ only

### Network Security

- Use VPC/private subnets for databases
- Configure security groups/firewall rules
- Enable DDoS protection

---

## Post-Deployment Verification

### Functional Verification

- [ ] Health endpoint responds
- [ ] Authentication works
- [ ] Firestore connection successful
- [ ] Redis connections successful
- [ ] API endpoints respond correctly
- [ ] Background jobs processing

### Performance Verification

- [ ] Response times within SLA
- [ ] Database query performance acceptable
- [ ] Memory usage within limits
- [ ] CPU usage within limits

### Security Verification

- [ ] SSL certificates valid
- [ ] Secrets properly configured
- [ ] Access controls enforced
- [ ] Audit logs recording

---

## Troubleshooting

### Common Issues

1. **Deployment Fails**
   - Check container logs
   - Verify environment variables
   - Check resource limits
   - Review task definition

2. **Health Checks Failing**
   - Verify health endpoint
   - Check database connectivity
   - Verify Redis connectivity
   - Review application logs

3. **Firestore Connection Errors**
   - Verify Firebase service account credentials
   - Check network connectivity to Firebase
   - Verify Firebase project ID
   - Check Firebase service account permissions

4. **High Error Rates**
   - Review application logs
   - Check database performance
   - Verify external service connectivity
   - Review recent changes

---

## Deployment Automation

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker Image
        run: |
          docker build -t patacao:${{ github.ref_name }} .
      
      - name: Push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker push $ECR_REGISTRY/patacao:${{ github.ref_name }}
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster patacao-production \
            --service patacao-api \
            --force-new-deployment
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

