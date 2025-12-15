# Application Use Cases List

Context:
We are building a Petshop Management System for Portugal.
Architecture: Clean / Hexagonal.
Phase: Application (Use Cases).
Domain entities and domain services already exist.

Task:
Generate the Application Use Case: CreateAppointmentUseCase.

Requirements:
- Orchestrates domain entities and domain services
- Uses repository interfaces (ports), not implementations
- Contains no framework or infrastructure code
- Handles validation and application-level rules
- Calls AppointmentSchedulingDomainService where appropriate
- Returns a result object or raises domain/application errors

Output:
- Use case description
- Input model
- Output model
- Main execution flow
- Error scenarios
- TypeScript implementation (application layer only)

Quality Check:
- Do not reimplement domain rules
- Do not include persistence logic
- Do not include HTTP concerns


## Administrative Module (ADMIN)
1. UC-ADMIN-001 - Create Company Profile
2. UC-ADMIN-002 - Update Company Profile
3. UC-ADMIN-003 - Create Store
4. UC-ADMIN-004 - Update Store
5. UC-ADMIN-005 - Create Customer
6. UC-ADMIN-006 - Update Customer
7. UC-ADMIN-007 - Archive Customer
8. UC-ADMIN-008 - Create Pet
9. UC-ADMIN-009 - Create User Staff
10. UC-ADMIN-010 - Search Customers
11. UC-ADMIN-011 - Import Customers

## Authentication Module (AUTH)
12. UC-AUTH-001 - User Login
13. UC-AUTH-002 - User Logout
14. UC-AUTH-003 - Password Reset Request
15. UC-AUTH-004 - Password Reset Confirm
16. UC-AUTH-005 - Create User
17. UC-AUTH-006 - Search Users

## Financial Module (FIN)
18. UC-FIN-001 - Create Invoice Draft
19. UC-FIN-002 - Issue Invoice
20. UC-FIN-003 - Mark Invoice Paid
21. UC-FIN-004 - Void Invoice
22. UC-FIN-005 - Create Credit Note
23. UC-FIN-006 - Create Transaction
24. UC-FIN-007 - Complete Transaction
25. UC-FIN-008 - Create Financial Export

## Inventory Module (INV)
26. UC-INV-001 - Receive Stock
27. UC-INV-002 - Stock Adjustment
28. UC-INV-003 - Inventory Reservation
29. UC-INV-004 - Stock Reconciliation
30. UC-INV-005 - Create Product
31. UC-INV-006 - Update Product
32. UC-INV-007 - Search Products
33. UC-INV-008 - Create Supplier
34. UC-INV-009 - Search Stock Movements
35. UC-INV-010 - Release Inventory Reservation
36. UC-INV-011 - Create Purchase Order
37. UC-INV-012 - Receive Purchase Order

## Services Module (SVC)
38. UC-SVC-001 - Create Service
39. UC-SVC-002 - Create Appointment
40. UC-SVC-003 - Confirm Appointment
41. UC-SVC-004 - Complete Appointment
42. UC-SVC-005 - Cancel Appointment
43. UC-SVC-006 - Search Appointments

**Total: 43 use cases**

