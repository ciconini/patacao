/**
 * Inventory Presentation Module
 *
 * NestJS module that registers all controllers for the Inventory module.
 */

import { Module } from '@nestjs/common';
import { InventoryApplicationModule } from '../application/inventory.application.module';
import { ProductController } from './controllers/product.controller';
import { StockMovementController } from './controllers/stock-movement.controller';
import { PurchaseOrderController } from './controllers/purchase-order.controller';
import { SupplierController } from './controllers/supplier.controller';
import { InventoryReservationController } from './controllers/inventory-reservation.controller';
import { StockController } from './controllers/stock.controller';

@Module({
  imports: [InventoryApplicationModule],
  controllers: [
    ProductController,
    StockMovementController,
    PurchaseOrderController,
    SupplierController,
    InventoryReservationController,
    StockController,
  ],
})
export class InventoryPresentationModule {}
