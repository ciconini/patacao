# Backend Endpoint Implementation Discrepancies

This document tracks discrepancies between the documented API endpoints (`docs/api/rest-endpoints.md`) and the actual backend implementation.

## Summary

The frontend implementation agent reported that the `GET /pets` endpoint is missing. After investigation, this is confirmed, along with several other pet-related endpoints that are documented but not fully implemented.

---

## Pet Endpoints (`/api/v1/pets`)

### ❌ Missing: GET /pets (List/Search)
**Documentation:** `docs/api/rest-endpoints.md` lines 183-187
- **Expected:** `GET /pets` with query params: `page`, `per_page`, `customer_id`, `q`, `microchip_id`
- **Status:** **COMPLETELY MISSING**
- **Location:** `backend/src/modules/administrative/presentation/controllers/pet.controller.ts`
- **Impact:** Frontend cannot list or search pets
- **Required Implementation:**
  - Create `SearchPetsUseCase` in `backend/src/modules/administrative/application/`
  - Add `search()` method to `PetRepository` interface
  - Implement search in `FirestorePetRepository`
  - Add `@Get()` endpoint handler in `PetController` (before `@Get(':id')` to avoid route conflicts)
  - Create `SearchPetsQueryDto` for query parameters

### ⚠️ Partially Implemented: GET /pets/{id}
**Documentation:** `docs/api/rest-endpoints.md` lines 195-199
- **Expected:** `GET /pets/{id}` - Returns a single pet by ID
- **Status:** **ENDPOINT EXISTS BUT NOT IMPLEMENTED**
- **Location:** `backend/src/modules/administrative/presentation/controllers/pet.controller.ts:122-132`
- **Current State:** Throws `Error('Not implemented yet')`
- **Required Implementation:**
  - Create `GetPetUseCase` in `backend/src/modules/administrative/application/`
  - Repository method `findById()` already exists in `PetRepository` interface
  - Wire up use case in controller

### ⚠️ Partially Implemented: PUT /pets/{id}
**Documentation:** `docs/api/rest-endpoints.md` lines 201-205
- **Expected:** `PUT /pets/{id}` - Updates an existing pet
- **Status:** **ENDPOINT EXISTS BUT NOT IMPLEMENTED**
- **Location:** `backend/src/modules/administrative/presentation/controllers/pet.controller.ts:100-116`
- **Current State:** Throws `Error('Not implemented yet')`
- **Required Implementation:**
  - Create `UpdatePetUseCase` in `backend/src/modules/administrative/application/`
  - Repository method `save()` already exists and can be used for updates
  - Wire up use case in controller

### ⚠️ Partially Implemented: DELETE /pets/{id}
**Documentation:** `docs/api/rest-endpoints.md` lines 207-211
- **Expected:** `DELETE /pets/{id}` - Deletes a pet (with constraints for linked appointments)
- **Status:** **ENDPOINT EXISTS BUT NOT IMPLEMENTED**
- **Location:** `backend/src/modules/administrative/presentation/controllers/pet.controller.ts:138-149`
- **Current State:** Throws `Error('Not implemented yet')`
- **Required Implementation:**
  - Create `DeletePetUseCase` in `backend/src/modules/administrative/application/`
  - Add `delete()` method to `PetRepository` interface
  - Implement delete in `FirestorePetRepository` (with validation for linked appointments)
  - Wire up use case in controller

### ✅ Implemented: POST /pets
**Documentation:** `docs/api/rest-endpoints.md` lines 189-193
- **Status:** **FULLY IMPLEMENTED**
- **Location:** `backend/src/modules/administrative/presentation/controllers/pet.controller.ts:51-94`

---

## Implementation Pattern Reference

For reference, other controllers follow these patterns:

### List/Search Endpoints
- **Appointments:** `@Get()` on base route (`GET /appointments`) with query params
- **Customers:** `@Get('search')` (`GET /customers/search`) with query params
- **Products:** `@Get('search')` (`GET /products/search`) with query params

**Recommendation for Pets:** Follow the appointments pattern (`@Get()` on base route) to match documentation which specifies `GET /pets` (not `GET /pets/search`).

### Example Implementation Pattern

See `backend/src/modules/services/presentation/controllers/appointment.controller.ts:178` for a working example of a list endpoint with query parameters.

---

## Priority Recommendations

1. **HIGH PRIORITY:** Implement `GET /pets` (list/search) - This is blocking frontend development
2. **MEDIUM PRIORITY:** Implement `GET /pets/{id}` - Needed for viewing individual pets
3. **MEDIUM PRIORITY:** Implement `PUT /pets/{id}` - Needed for editing pets
4. **LOW PRIORITY:** Implement `DELETE /pets/{id}` - Less critical, can be deferred

---

## Notes

- The `PetRepository` interface (`backend/src/modules/administrative/ports/pet.repository.port.ts`) currently only has:
  - `save(pet: Pet): Promise<Pet>`
  - `findById(id: string): Promise<Pet | null>`
  - `countByCustomerId(customerId: string): Promise<number>`
  
- Missing repository methods needed:
  - `search(criteria: SearchCriteria): Promise<PaginatedResult<Pet>>` (for list endpoint)
  - `delete(id: string): Promise<void>` (for delete endpoint, if not using soft delete)

- The `CreatePetUseCase` is fully implemented and can serve as a reference for the pattern.

