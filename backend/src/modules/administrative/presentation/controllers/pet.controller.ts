/**
 * Pet Controller
 *
 * REST API controller for Pet management endpoints.
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
import { CreatePetDto, UpdatePetDto, PetResponseDto } from '../dto/pet.dto';
import { PaginatedResponseDto, PaginationMetaDto } from '../../../../shared/presentation/dto/pagination.dto';
import { SearchPetsQueryDto } from '../dto/search-pets-query.dto';
import {
  CreatePetUseCase,
  CreatePetInput,
  CreatePetOutput,
} from '../../application/create-pet.use-case';
import {
  GetPetUseCase,
  GetPetInput,
  GetPetOutput,
} from '../../application/get-pet.use-case';
import {
  UpdatePetUseCase,
  UpdatePetInput,
  UpdatePetOutput,
} from '../../application/update-pet.use-case';
import {
  DeletePetUseCase,
  DeletePetInput,
} from '../../application/delete-pet.use-case';
import {
  SearchPetsUseCase,
  SearchPetsInput,
} from '../../application/search-pets.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@ApiTags('Administrative')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(PaginatedResponseDto, PaginationMetaDto)
@Controller('api/v1/pets')
@UseGuards(FirebaseAuthGuard)
export class PetController {
  constructor(
    private readonly createPetUseCase: CreatePetUseCase,
    private readonly getPetUseCase: GetPetUseCase,
    private readonly updatePetUseCase: UpdatePetUseCase,
    private readonly deletePetUseCase: DeletePetUseCase,
    private readonly searchPetsUseCase: SearchPetsUseCase,
  ) {}

  /**
   * Create a new pet
   * POST /api/v1/pets
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create pet', description: 'Creates a new pet profile for a customer' })
  @ApiBody({ type: CreatePetDto })
  @ApiResponse({ status: 201, description: 'Pet created successfully', type: PetResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async create(
    @Body() createDto: CreatePetDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PetResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: CreatePetInput = {
      customerId: createDto.customerId,
      name: createDto.name,
      species: createDto.species,
      breed: createDto.breed,
      dateOfBirth: createDto.dateOfBirth, // ISO date string
      microchipId: createDto.microchipId,
      medicalNotes: createDto.medicalNotes,
      vaccination:
        createDto.vaccination?.map((v: any) => ({
          vaccine: v.vaccine,
          date: v.date, // ISO date string
          expires: v.expires, // ISO date string
          administered_by: v.administered_by,
        })) || [],
      performedBy: userId,
    };

    const result = await this.createPetUseCase.execute(input);

    if (!result.success || !result.pet) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.pet);
  }

  /**
   * Search pets
   * GET /api/v1/pets
   */
  @Get()
  @ApiOperation({ summary: 'Search pets', description: 'Searches and filters pets with pagination' })
  @ApiQuery({ name: 'customerId', required: false, type: String, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'species', required: false, type: String, description: 'Filter by species' })
  @ApiQuery({ name: 'breed', required: false, type: String, description: 'Filter by breed' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'perPage', required: false, type: Number, example: 20, description: 'Items per page' })
  @ApiQuery({ name: 'sort', required: false, type: String, description: 'Sort field and direction' })
  @ApiResponse({
    status: 200,
    description: 'Pets retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/PetResponseDto' },
        },
        meta: { $ref: '#/components/schemas/PaginationMetaDto' },
      },
      required: ['items', 'meta'],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async search(
    @Query() query: SearchPetsQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedResponseDto<PetResponseDto>> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: SearchPetsInput = {
      customerId: query.customerId,
      species: query.species,
      breed: query.breed,
      page: query.page || 1,
      perPage: query.perPage || 20,
      sort: query.sort,
      performedBy: userId,
    };

    const result = await this.searchPetsUseCase.execute(input);

    if (!result.success || !result.data) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      items: result.data.items.map((item: any) => this.mapToResponseDto(item)),
      meta: result.data.meta,
    };
  }

  /**
   * Get a pet by ID
   * GET /api/v1/pets/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get pet by ID', description: 'Retrieves a pet profile by its ID' })
  @ApiParam({ name: 'id', description: 'Pet UUID', type: String })
  @ApiResponse({ status: 200, description: 'Pet retrieved successfully', type: PetResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Pet not found' })
  async findOne(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<PetResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: GetPetInput = {
      id,
      performedBy: userId,
    };

    const result = await this.getPetUseCase.execute(input);

    if (!result.success || !result.pet) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.pet);
  }

  /**
   * Update an existing pet
   * PUT /api/v1/pets/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update pet', description: 'Updates an existing pet profile' })
  @ApiParam({ name: 'id', description: 'Pet UUID', type: String })
  @ApiBody({ type: UpdatePetDto })
  @ApiResponse({ status: 200, description: 'Pet updated successfully', type: PetResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Pet not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePetDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PetResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: UpdatePetInput = {
      id,
      name: updateDto.name,
      species: updateDto.species,
      breed: updateDto.breed,
      dateOfBirth: updateDto.dateOfBirth,
      microchipId: updateDto.microchipId,
      medicalNotes: updateDto.medicalNotes,
      vaccination:
        updateDto.vaccination?.map((v: any) => ({
          vaccine: v.vaccine,
          date: v.date,
          expires: v.expires,
          administered_by: v.administered_by,
        })) || [],
      performedBy: userId,
    };

    const result = await this.updatePetUseCase.execute(input);

    if (!result.success || !result.pet) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.pet);
  }

  /**
   * Delete a pet
   * DELETE /api/v1/pets/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete pet', description: 'Deletes a pet profile' })
  @ApiParam({ name: 'id', description: 'Pet UUID', type: String })
  @ApiResponse({ status: 204, description: 'Pet deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Pet not found' })
  async delete(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: DeletePetInput = {
      id,
      performedBy: userId,
    };

    const result = await this.deletePetUseCase.execute(input);

    if (!result.success) {
      throw mapApplicationErrorToHttpException(result.error!);
    }
  }

  /**
   * Maps use case output to response DTO
   */
  private mapToResponseDto(output: CreatePetOutput | GetPetOutput | UpdatePetOutput | any): PetResponseDto {
    return {
      id: output.id,
      customerId: output.customerId,
      name: output.name,
      species: output.species,
      breed: output.breed,
      dateOfBirth: output.dateOfBirth,
      age: output.age,
      microchipId: output.microchipId,
      medicalNotes: output.medicalNotes,
      vaccination: output.vaccination.map((v: any) => ({
        vaccine: v.vaccineType || v.vaccine,
        date:
          (v.administeredDate || v.date) instanceof Date
            ? (v.administeredDate || v.date).toISOString()
            : v.administeredDate || v.date,
        expires:
          (v.nextDueDate || v.expires) instanceof Date
            ? (v.nextDueDate || v.expires).toISOString()
            : v.nextDueDate || v.expires,
        administered_by: v.veterinarian || v.administered_by,
      })),
      createdAt: output.createdAt,
      updatedAt: output.updatedAt,
    };
  }
}
