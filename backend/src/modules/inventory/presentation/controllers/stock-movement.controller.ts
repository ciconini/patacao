/**
 * Stock Movement Controller
 *
 * REST API controller for Stock Movement endpoints.
 */

import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  FirebaseAuthGuard,
  AuthenticatedRequest,
} from '../../../../shared/auth/firebase-auth.guard';
import { SearchStockMovementsQueryDto, StockMovementEnrichedResponseDto } from '../dto/stock.dto';
import { PaginatedResponseDto } from '../../../../shared/presentation/dto/pagination.dto';
import {
  SearchStockMovementsUseCase,
  SearchStockMovementsInput,
} from '../../application/search-stock-movements.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@Controller('api/v1/stock-movements')
@UseGuards(FirebaseAuthGuard)
export class StockMovementController {
  constructor(private readonly searchStockMovementsUseCase: SearchStockMovementsUseCase) {}

  /**
   * Search stock movements
   * GET /api/v1/stock-movements/search
   */
  @Get('search')
  async search(
    @Query() query: SearchStockMovementsQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedResponseDto<StockMovementEnrichedResponseDto>> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: SearchStockMovementsInput = {
      productId: query.productId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      reason: query.reason,
      locationId: query.locationId,
      performedBy: query.performedBy,
      referenceId: query.referenceId,
      page: query.page || 1,
      perPage: query.perPage || 20,
      sort: query.sort,
      performedByUser: userId,
    };

    const result = await this.searchStockMovementsUseCase.execute(input);

    if (!result.success || !result.data) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      items: result.data.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantityChange,
        movementType: item.quantityChange > 0 ? 'in' : 'out',
        reason: item.reason,
        locationId: item.locationId,
        performedBy: item.performedBy,
        referenceId: item.referenceId,
        createdAt: item.createdAt,
        product: {
          id: item.productId,
          name: item.productName,
          sku: item.productSku,
        },
        performedByUser: {
          id: item.performedBy,
          fullName: item.performedByName,
        },
        location: item.locationName
          ? {
              id: item.locationId,
              name: item.locationName,
            }
          : undefined,
      })),
      meta: result.data.meta,
    };
  }
}
