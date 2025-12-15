# API Versioning Strategy — Patacão Petshop

## Overview

This document defines the API versioning strategy for the Patacão Petshop Management System API.

**Current Version:** v1  
**Versioning Scheme:** URL path versioning  
**Base URL:** `https://api.patacao.com/api/v1`

---

## Versioning Approach

### URL Path Versioning

**Format:** `/api/{version}/{resource}`

**Examples:**
- `GET /api/v1/customers`
- `POST /api/v1/invoices`
- `GET /api/v2/customers` (future version)

**Rationale:**
- Clear and explicit
- Easy to understand
- Allows multiple versions to coexist
- Standard REST practice

---

## Version Numbering

### Semantic Versioning

**Format:** `v{major}.{minor}`

- **Major Version:** Breaking changes (e.g., v1 → v2)
- **Minor Version:** Non-breaking changes (e.g., v1.0 → v1.1)

**Current:** v1 (v1.0 implied)

### Version Lifecycle

1. **v1.0** - Initial API release
2. **v1.1** - Non-breaking additions (new endpoints, optional fields)
3. **v2.0** - Breaking changes (field removals, type changes)

---

## Breaking Changes

### What Constitutes a Breaking Change

1. **Removing Endpoints**
   - Removing an endpoint entirely
   - Changing HTTP method

2. **Removing Fields**
   - Removing required fields from request/response
   - Removing optional fields (if widely used)

3. **Changing Field Types**
   - Changing data types (string → integer)
   - Changing formats (date → datetime)

4. **Changing Behavior**
   - Changing default values
   - Changing validation rules
   - Changing error responses

5. **Changing Authentication**
   - Changing authentication mechanism
   - Changing required permissions

### Non-Breaking Changes

1. **Adding Endpoints**
   - New endpoints don't break existing clients

2. **Adding Optional Fields**
   - Adding optional fields to requests/responses

3. **Adding New Response Fields**
   - Adding fields to responses (clients ignore unknown fields)

4. **Relaxing Validation**
   - Making required fields optional
   - Removing validation constraints

---

## Version Deprecation Policy

### Deprecation Timeline

1. **Announcement:** 6 months before deprecation
2. **Deprecation:** Version marked as deprecated
3. **Sunset:** Version removed (12 months after deprecation)

### Deprecation Process

1. **Announce Deprecation**
   - Update API documentation
   - Add deprecation headers to responses
   - Notify API consumers

2. **Deprecation Period**
   - Version remains functional
   - Deprecation warnings in responses
   - Support for migration

3. **Sunset**
   - Version removed
   - Redirect to latest version (if possible)
   - Graceful error messages

### Deprecation Headers

```
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: <https://api.patacao.com/api/v2>; rel="successor-version"
```

---

## Migration Guide

### Version Migration

**From v1 to v2 (when applicable):**

1. **Review Breaking Changes**
   - Review changelog
   - Identify affected endpoints
   - Plan migration

2. **Update API Calls**
   - Update base URL
   - Update request/response handling
   - Update error handling

3. **Test Migration**
   - Test in staging environment
   - Verify functionality
   - Update integration tests

4. **Deploy**
   - Deploy to production
   - Monitor for issues
   - Rollback if necessary

---

## Version Support

### Supported Versions

- **Current:** v1 (fully supported)
- **Previous:** None (v1 is first version)

### Support Policy

- **Current Version:** Full support, new features
- **Deprecated Version:** Security fixes only
- **Sunset Version:** No support

---

## Best Practices

### For API Consumers

1. **Pin Version**
   - Use specific version in API calls
   - Don't rely on default version

2. **Monitor Deprecation**
   - Check deprecation headers
   - Subscribe to API updates
   - Plan migrations early

3. **Handle Errors Gracefully**
   - Handle version not found errors
   - Provide fallback mechanisms

### For API Developers

1. **Minimize Breaking Changes**
   - Prefer non-breaking changes
   - Use feature flags for experiments
   - Version early, version often

2. **Document Changes**
   - Maintain changelog
   - Document migration guides
   - Provide examples

3. **Test Backward Compatibility**
   - Test existing clients with new version
   - Verify non-breaking changes
   - Monitor for regressions

---

## Changelog

### v1.0 (Initial Release)

- Initial API release
- All endpoints available
- Authentication and authorization
- All modules implemented

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

