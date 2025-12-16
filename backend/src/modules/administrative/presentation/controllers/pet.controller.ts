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
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FirebaseAuthGuard, AuthenticatedRequest } from '../../../../shared/auth/firebase-auth.guard';
import { CreatePetDto, UpdatePetDto, PetResponseDto } from '../dto/pet.dto';
import { CreatePetUseCase, CreatePetInput, CreatePetOutput } from '../../application/create-pet.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@Controller('api/v1/pets')
@UseGuards(FirebaseAuthGuard)
export class PetController {
  constructor(
    private readonly createPetUseCase: CreatePetUseCase,
  ) {}

  /**
   * Create a new pet
   * POST /api/v1/pets
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
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
      vaccination: createDto.vaccination?.map((v: any) => ({
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
   * Update an existing pet
   * PUT /api/v1/pets/:id
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePetDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PetResponseDto> {
    // TODO: Implement UpdatePetUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Get a pet by ID
   * GET /api/v1/pets/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PetResponseDto> {
    // TODO: Implement GetPetUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Delete a pet
   * DELETE /api/v1/pets/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    // TODO: Implement DeletePetUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Maps use case output to response DTO
   */
  private mapToResponseDto(output: CreatePetOutput): PetResponseDto {
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
        date: (v.administeredDate || v.date) instanceof Date 
          ? (v.administeredDate || v.date).toISOString() 
          : (v.administeredDate || v.date),
        expires: (v.nextDueDate || v.expires) instanceof Date 
          ? (v.nextDueDate || v.expires).toISOString() 
          : (v.nextDueDate || v.expires),
        administered_by: v.veterinarian || v.administered_by,
      })),
      createdAt: output.createdAt,
      updatedAt: output.updatedAt,
    };
  }
}
