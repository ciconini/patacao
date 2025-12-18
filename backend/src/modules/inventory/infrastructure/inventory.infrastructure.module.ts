/**
 * Inventory Infrastructure Module
 *
 * NestJS module that provides Firestore implementations for Inventory module repositories.
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../adapters/db/database.module';
import { FirestoreProductRepository } from './firestore-product.repository';
import { FirestoreStockMovementRepository } from './firestore-stock-movement.repository';
import { FirestoreStockBatchRepository } from './firestore-stock-batch.repository';
import { FirestoreSupplierRepository } from './firestore-supplier.repository';
import { FirestorePurchaseOrderRepository } from './firestore-purchase-order.repository';
import { FirestoreInventoryReservationRepository } from './firestore-inventory-reservation.repository';
import { ProductRepository } from '../ports/product.repository.port';
import { StockMovementRepository } from '../ports/stock-movement.repository.port';
import { StockBatchRepository } from '../ports/stock-batch.repository.port';
import { SupplierRepository } from '../ports/supplier.repository.port';
import { PurchaseOrderRepository } from '../ports/purchase-order.repository.port';
import { InventoryReservationRepository } from '../ports/inventory-reservation.repository.port';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: 'ProductRepository',
      useClass: FirestoreProductRepository,
    },
    {
      provide: 'StockMovementRepository',
      useClass: FirestoreStockMovementRepository,
    },
    {
      provide: 'StockBatchRepository',
      useClass: FirestoreStockBatchRepository,
    },
    {
      provide: 'SupplierRepository',
      useClass: FirestoreSupplierRepository,
    },
    {
      provide: 'PurchaseOrderRepository',
      useClass: FirestorePurchaseOrderRepository,
    },
    {
      provide: 'InventoryReservationRepository',
      useClass: FirestoreInventoryReservationRepository,
    },
  ],
  exports: [
    'ProductRepository',
    'StockMovementRepository',
    'StockBatchRepository',
    'SupplierRepository',
    'PurchaseOrderRepository',
    'InventoryReservationRepository',
  ],
})
export class InventoryInfrastructureModule {}
