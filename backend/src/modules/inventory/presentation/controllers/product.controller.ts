/**
 * Product Controller
 *
 * REST API controller for Product management endpoints.
 */

import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiExtraModels,
} from '@nestjs/swagger';
import {
  FirebaseAuthGuard,
  AuthenticatedRequest,
} from '../../../../shared/auth/firebase-auth.guard';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  SearchProductsQueryDto,
} from '../dto/product.dto';
import { PaginatedResponseDto, PaginationMetaDto } from '../../../../shared/presentation/dto/pagination.dto';
import {
  CreateProductUseCase,
  CreateProductInput,
} from '../../application/create-product.use-case';
import {
  UpdateProductUseCase,
  UpdateProductInput,
} from '../../application/update-product.use-case';
import {
  SearchProductsUseCase,
  SearchProductsInput,
} from '../../application/search-products.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@ApiTags('Inventory')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(PaginatedResponseDto, PaginationMetaDto)
@Controller('api/v1/products')
@UseGuards(FirebaseAuthGuard)
export class ProductController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly searchProductsUseCase: SearchProductsUseCase,
  ) {}

  /**
   * Create a new product
   * POST /api/v1/products
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create product',
    description: 'Creates a new product with SKU and pricing information',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Product with this SKU already exists' })
  async create(
    @Body() createDto: CreateProductDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ProductResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: CreateProductInput = {
      sku: createDto.sku,
      name: createDto.name,
      description: createDto.description,
      category: createDto.category,
      unitPrice: createDto.unitPrice,
      vatRate: createDto.vatRate,
      stockTracked: createDto.stockTracked,
      reorderThreshold: createDto.reorderThreshold,
      supplierId: createDto.supplierId,
      performedBy: userId,
    };

    const result = await this.createProductUseCase.execute(input);

    if (!result.success || !result.product) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.product);
  }

  /**
   * Update an existing product
   * PUT /api/v1/products/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update product', description: 'Updates an existing product' })
  @ApiParam({ name: 'id', description: 'Product UUID', type: String })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProductDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ProductResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: UpdateProductInput = {
      id,
      name: updateDto.name,
      description: updateDto.description,
      category: updateDto.category,
      unitPrice: updateDto.unitPrice,
      vatRate: updateDto.vatRate,
      stockTracked: updateDto.stockTracked,
      reorderThreshold: updateDto.reorderThreshold,
      supplierId: updateDto.supplierId,
      performedBy: userId,
    };

    const result = await this.updateProductUseCase.execute(input);

    if (!result.success || !result.product) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.product);
  }

  /**
   * Get a product by ID
   * GET /api/v1/products/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID', description: 'Retrieves a product by its ID' })
  @ApiParam({ name: 'id', description: 'Product UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string): Promise<ProductResponseDto> {
    // TODO: Implement GetProductUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Search products
   * GET /api/v1/products/search
   */
  @Get('search')
  @ApiOperation({
    summary: 'Search products',
    description: 'Searches and filters products with pagination support',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Search query (name, SKU, description)',
  })
  @ApiQuery({ name: 'sku', required: false, type: String, description: 'Filter by SKU' })
  @ApiQuery({ name: 'name', required: false, type: String, description: 'Filter by name' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by category' })
  @ApiQuery({
    name: 'supplierId',
    required: false,
    type: String,
    description: 'Filter by supplier ID',
  })
  @ApiQuery({
    name: 'stockTracked',
    required: false,
    type: Boolean,
    description: 'Filter by stock tracking status',
  })
  @ApiQuery({
    name: 'lowStock',
    required: false,
    type: Boolean,
    description: 'Filter by low stock status',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number' })
  @ApiQuery({
    name: 'perPage',
    required: false,
    type: Number,
    example: 20,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Sort field and direction',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/ProductResponseDto' },
        },
        meta: { $ref: '#/components/schemas/PaginationMetaDto' },
      },
      required: ['items', 'meta'],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async search(
    @Query() query: SearchProductsQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: SearchProductsInput = {
      q: query.q,
      sku: query.sku,
      name: query.name,
      category: query.category,
      supplierId: query.supplierId,
      stockTracked: query.stockTracked,
      lowStock: query.lowStock,
      page: query.page || 1,
      perPage: query.perPage || 20,
      sort: query.sort,
      performedBy: userId,
    };

    const result = await this.searchProductsUseCase.execute(input);

    if (!result.success || !result.data) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      items: result.data.items.map((item: any) => this.mapToResponseDto(item)),
      meta: result.data.meta,
    };
  }

  /**
   * Delete a product
   * DELETE /api/v1/products/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete product', description: 'Deletes a product (soft delete)' })
  @ApiParam({ name: 'id', description: 'Product UUID', type: String })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async delete(@Param('id') id: string): Promise<void> {
    // TODO: Implement DeleteProductUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Maps use case output to response DTO
   */
  private mapToResponseDto(output: any): ProductResponseDto {
    return {
      id: output.id,
      sku: output.sku,
      name: output.name,
      description: output.description,
      category: output.category,
      unitPrice: output.unitPrice,
      vatRate: output.vatRate,
      stockTracked: output.stockTracked,
      reorderThreshold: output.reorderThreshold,
      supplierId: output.supplierId,
      currentStock: output.currentStock,
      createdAt: output.createdAt,
      updatedAt: output.updatedAt,
    };
  }
}
