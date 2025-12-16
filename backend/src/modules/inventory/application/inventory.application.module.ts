/**
 * Inventory Application Module
 * 
 * NestJS module that registers all use cases for the Inventory module.
 */

import { Module } from '@nestjs/common';
import { InventoryInfrastructureModule } from '../infrastructure/inventory.infrastructure.module';
import { SharedModule } from '../../../shared/shared.module';
import { CreateProductUseCase } from './create-product.use-case';
import { UpdateProductUseCase } from './update-product.use-case';
import { SearchProductsUseCase } from './search-products.use-case';
import { CreateSupplierUseCase } from './create-supplier.use-case';
import { CreatePurchaseOrderUseCase } from './create-purchase-order.use-case';
import { ReceivePurchaseOrderUseCase } from './receive-purchase-order.use-case';
import { ReceiveStockUseCase } from './receive-stock.use-case';
import { StockAdjustmentUseCase } from './stock-adjustment.use-case';
import { StockReconciliationUseCase } from './stock-reconciliation.use-case';
import { CreateInventoryReservationUseCase } from './inventory-reservation.use-case';
import { ReleaseInventoryReservationUseCase } from './release-inventory-reservation.use-case';
import { SearchStockMovementsUseCase } from './search-stock-movements.use-case';

@Module({
  imports: [
    InventoryInfrastructureModule,
    SharedModule,
  ],
  providers: [
    CreateProductUseCase,
    UpdateProductUseCase,
    SearchProductsUseCase,
    CreateSupplierUseCase,
    CreatePurchaseOrderUseCase,
    ReceivePurchaseOrderUseCase,
    ReceiveStockUseCase,
    StockAdjustmentUseCase,
    StockReconciliationUseCase,
    CreateInventoryReservationUseCase,
    ReleaseInventoryReservationUseCase,
    SearchStockMovementsUseCase,
  ],
  exports: [
    CreateProductUseCase,
    UpdateProductUseCase,
    SearchProductsUseCase,
    CreateSupplierUseCase,
    CreatePurchaseOrderUseCase,
    ReceivePurchaseOrderUseCase,
    ReceiveStockUseCase,
    StockAdjustmentUseCase,
    StockReconciliationUseCase,
    CreateInventoryReservationUseCase,
    ReleaseInventoryReservationUseCase,
    SearchStockMovementsUseCase,
  ],
})
export class InventoryApplicationModule {}

