# Swagger/OpenAPI Setup Guide

## Overview

This document describes how to add Swagger/OpenAPI documentation to controllers and DTOs in the Patacão Petshop backend.

## Basic Setup

Swagger is configured in `main.ts` and is available at:
- **Development/Staging**: `http://localhost:3000/api/v1/docs`
- **Production**: Disabled by default (can be enabled via configuration)

## Adding Documentation to Controllers

### 1. Import Swagger Decorators

```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
```

### 2. Tag the Controller

```typescript
@ApiTags('Administrative') // Group endpoints by module
@Controller('companies')
export class CompanyController {
  // ...
}
```

### 3. Document Endpoints

```typescript
@Post()
@ApiOperation({ 
  summary: 'Create company profile',
  description: 'Creates a new company profile with fiscal data and settings'
})
@ApiBody({ type: CreateCompanyDto })
@ApiResponse({ 
  status: 201, 
  description: 'Company created successfully',
  type: CompanyResponseDto 
})
@ApiResponse({ 
  status: 400, 
  description: 'Invalid input data' 
})
@ApiResponse({ 
  status: 401, 
  description: 'Unauthorized' 
})
@ApiResponse({ 
  status: 403, 
  description: 'Forbidden - insufficient permissions' 
})
async create(@Body() input: CreateCompanyDto): Promise<CompanyResponseDto> {
  // ...
}
```

### 4. Document Authentication

For endpoints requiring authentication:

```typescript
@ApiBearerAuth('JWT-auth') // Matches the security scheme name in main.ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleId.Owner)
@Get(':id')
@ApiOperation({ summary: 'Get company by ID' })
@ApiParam({ name: 'id', description: 'Company UUID' })
@ApiResponse({ status: 200, type: CompanyResponseDto })
@ApiResponse({ status: 404, description: 'Company not found' })
async findById(@Param('id') id: string): Promise<CompanyResponseDto> {
  // ...
}
```

## Adding Documentation to DTOs

### 1. Import Swagger Decorators

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
```

### 2. Document Properties

```typescript
export class CreateCompanyDto {
  @ApiProperty({
    description: 'Company name',
    example: 'Patacão Petshop',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Portuguese NIF (tax identification number)',
    example: '500000000',
    pattern: '^[0-9]{9}$',
  })
  @IsString()
  @IsNotEmpty()
  @IsPortugueseNIF()
  nif: string;

  @ApiPropertyOptional({
    description: 'Company website URL',
    example: 'https://www.patacao.pt',
  })
  @IsOptional()
  @IsUrl()
  website?: string;
}
```

### 3. Document Nested Objects

```typescript
export class AddressDto {
  @ApiProperty({ example: 'Rua das Flores, 123' })
  street: string;

  @ApiProperty({ example: 'Lisboa' })
  city: string;

  @ApiProperty({ example: '1000-000' })
  postalCode: string;

  @ApiProperty({ example: 'Portugal' })
  country: string;
}

export class CreateCompanyDto {
  @ApiProperty({ type: AddressDto })
  address: AddressDto;
}
```

## Common Patterns

### Pagination

```typescript
@ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
@ApiQuery({ name: 'per_page', required: false, type: Number, example: 20 })
@ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
@Get()
async search(@Query() query: SearchQueryDto) {
  // ...
}
```

### Path Parameters

```typescript
@ApiParam({ 
  name: 'id', 
  description: 'Resource UUID',
  type: String,
  format: 'uuid'
})
@Get(':id')
async findById(@Param('id') id: string) {
  // ...
}
```

### Error Responses

```typescript
@ApiResponse({ 
  status: 400, 
  description: 'Bad Request - Invalid input',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 400 },
      message: { type: 'string', example: 'Validation failed' },
      errors: { type: 'array', items: { type: 'string' } },
    },
  },
})
@ApiResponse({ 
  status: 401, 
  description: 'Unauthorized - Invalid or missing token' 
})
@ApiResponse({ 
  status: 403, 
  description: 'Forbidden - Insufficient permissions' 
})
@ApiResponse({ 
  status: 404, 
  description: 'Not Found - Resource does not exist' 
})
@ApiResponse({ 
  status: 409, 
  description: 'Conflict - Resource already exists' 
})
```

## Example: Complete Controller

```typescript
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard';
import { RolesGuard } from '../../shared/auth/roles.guard';
import { Roles } from '../../shared/auth/roles.decorator';
import { RoleId } from '../../../users/domain/user.entity';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { CompanyResponseDto } from '../dto/company-response.dto';

@ApiTags('Administrative')
@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class CompanyController {
  @Post()
  @Roles(RoleId.Owner)
  @ApiOperation({ summary: 'Create company profile' })
  @ApiResponse({ status: 201, description: 'Company created', type: CompanyResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() input: CreateCompanyDto): Promise<CompanyResponseDto> {
    // ...
  }

  @Get(':id')
  @Roles(RoleId.Owner, RoleId.Manager)
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', description: 'Company UUID' })
  @ApiResponse({ status: 200, type: CompanyResponseDto })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async findById(@Param('id') id: string): Promise<CompanyResponseDto> {
    // ...
  }
}
```

## Testing Swagger Documentation

1. Start the application: `npm run start:dev`
2. Navigate to: `http://localhost:3000/api/v1/docs`
3. Test endpoints directly from Swagger UI
4. Use "Authorize" button to add JWT token for protected endpoints

## Best Practices

1. **Always document**: Every endpoint should have `@ApiOperation` and `@ApiResponse`
2. **Use tags**: Group related endpoints with `@ApiTags`
3. **Document DTOs**: Use `@ApiProperty` on all DTO properties
4. **Include examples**: Provide example values for better documentation
5. **Document errors**: Include all possible error responses
6. **Use descriptions**: Add meaningful descriptions to operations and properties
7. **Mark optional fields**: Use `@ApiPropertyOptional` for optional properties

## Next Steps

1. Add Swagger decorators to all controllers
2. Document all DTOs with `@ApiProperty`
3. Add examples and descriptions
4. Test all endpoints in Swagger UI
5. Export OpenAPI spec for API clients

