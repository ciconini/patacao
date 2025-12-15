# Database Adapters

This directory contains database-related adapters and infrastructure code.

## Unit of Work Pattern

The `UnitOfWork` pattern is implemented to manage transaction boundaries and coordinate multiple repository operations within a single atomic transaction.

### Usage

#### Basic Usage

```typescript
import { UnitOfWork } from '../../shared/ports/unit-of-work.port';
import { FirestoreTransactionContext } from '../adapters/db/firestore-unit-of-work';

// Inject UnitOfWork in your use case or service
constructor(
  private readonly unitOfWork: UnitOfWork,
  private readonly customerRepository: CustomerRepository,
  private readonly invoiceRepository: InvoiceRepository,
) {}

// Use execute() for automatic transaction management
async createInvoiceWithCustomer(customerData: any, invoiceData: any) {
  return await this.unitOfWork.execute(async (context: FirestoreTransactionContext) => {
    // Create customer
    const customer = await this.customerRepository.save(customerData, context);
    
    // Create invoice linked to customer
    const invoice = await this.invoiceRepository.save({
      ...invoiceData,
      customerId: customer.id,
    }, context);
    
    return { customer, invoice };
  });
}
```

#### Manual Transaction Management

```typescript
// Start transaction
await this.unitOfWork.start();

try {
  const context = this.unitOfWork.getTransaction();
  
  // Perform operations with context
  await this.repository1.save(entity1, context);
  await this.repository2.save(entity2, context);
  
  // Commit
  await this.unitOfWork.commit();
} catch (error) {
  // Rollback on error
  await this.unitOfWork.rollback();
  throw error;
}
```

### Firestore Transaction Context

The `FirestoreTransactionContext` provides:
- `transaction`: The Firestore transaction object
- `firestore`: The Firestore instance

Repositories can accept this context as an optional parameter to operate within the transaction:

```typescript
async save(entity: Entity, context?: FirestoreTransactionContext): Promise<Entity> {
  const docRef = this.firestore.collection(this.collectionName).doc(entity.id);
  const document = this.toDocument(entity);
  
  if (context) {
    // Use transaction
    context.transaction.set(docRef, document);
  } else {
    // Regular operation
    await docRef.set(document);
  }
  
  return entity;
}
```

### Important Notes

1. **Firestore Transactions**: Firestore uses optimistic concurrency control. Transactions automatically retry on conflicts.

2. **Transaction Limits**: Firestore transactions have a 60-second timeout and can read up to 500 documents.

3. **Nested Transactions**: Firestore does not support nested transactions. Use `execute()` for the entire operation.

4. **Read Operations**: All reads within a transaction must happen before any writes.

5. **Automatic Retry**: Firestore automatically retries transactions on conflicts, but your code should be idempotent.

