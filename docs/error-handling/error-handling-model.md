# Error Handling Model — Patacão Petshop Management System

## Standard Error Structure

All API and application errors follow a consistent structure to ensure predictable error handling across the system.

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Mensagem de erro em português",
    "http_status": 400,
    "details": {
      "field": "campo_específico",
      "value": "valor_fornecido",
      "constraint": "regra_violada"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Error Structure Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | String | Yes | Machine-readable error code (e.g., `INVALID_NIF`, `NOT_FOUND`) |
| `message` | String | Yes | Human-readable error message in Portuguese (Portugal) |
| `http_status` | Integer | Yes | HTTP status code (400, 401, 403, 404, 409, 422, 423, 429, 500, 503) |
| `details` | Object | No | Additional error context (field name, value, constraint, etc.) |
| `timestamp` | String (ISO 8601) | Yes | Error occurrence timestamp |
| `request_id` | UUID | Yes | Unique request identifier for tracing |

---

## Error Categories

### ValidationError

**HTTP Status:** `400 Bad Request`

**Description:**  
Errors that occur when input data fails validation rules (format, type, constraints, required fields).

**Common Causes:**
- Missing required fields
- Invalid data format
- Value outside allowed range
- Invalid data type

**Example:**
```json
{
  "error": {
    "code": "INVALID_EMAIL",
    "message": "Formato de email inválido",
    "http_status": 400,
    "details": {
      "field": "email",
      "value": "invalid-email",
      "constraint": "Deve ser um endereço de email válido"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### BusinessRuleError

**HTTP Status:** `400 Bad Request` or `422 Unprocessable Entity`

**Description:**  
Errors that occur when a business rule is violated, even if the input data is technically valid.

**Common Causes:**
- Invalid state transitions
- Business logic violations
- Constraint violations (e.g., negative stock)
- Invalid relationships

**Example:**
```json
{
  "error": {
    "code": "INVOICE_NOT_DRAFT",
    "message": "A fatura não está em estado de rascunho. Apenas faturas em rascunho podem ser emitidas",
    "http_status": 400,
    "details": {
      "invoice_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "current_status": "issued",
      "required_status": "draft"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### NotFoundError

**HTTP Status:** `404 Not Found`

**Description:**  
Errors that occur when a requested resource does not exist.

**Common Causes:**
- Invalid resource ID
- Resource was deleted
- Resource does not exist in the system

**Example:**
```json
{
  "error": {
    "code": "CUSTOMER_NOT_FOUND",
    "message": "Cliente não encontrado",
    "http_status": 404,
    "details": {
      "resource": "customer",
      "id": "770e8400-e29b-41d4-a716-446655440000"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### PermissionDeniedError

**HTTP Status:** `403 Forbidden`

**Description:**  
Errors that occur when a user lacks the required permissions to perform an action.

**Common Causes:**
- Insufficient role permissions
- Store access restrictions
- Resource ownership restrictions
- Action not allowed for user role

**Example:**
```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Não tem permissão para criar perfis de empresa. Apenas utilizadores com papel de Proprietário podem criar perfis de empresa",
    "http_status": 403,
    "details": {
      "required_role": "Owner",
      "user_role": "Manager",
      "action": "company:create"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### ConflictError

**HTTP Status:** `409 Conflict`

**Description:**  
Errors that occur when a request conflicts with the current state of the system.

**Common Causes:**
- Duplicate unique values (email, SKU, NIF)
- Concurrent modification conflicts
- Double-booking conflicts
- Insufficient resources (stock, availability)

**Example:**
```json
{
  "error": {
    "code": "DUPLICATE_EMAIL",
    "message": "Já existe um utilizador com este endereço de email",
    "http_status": 409,
    "details": {
      "field": "email",
      "value": "staff@patacao.pt",
      "existing_resource": "user"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### InfrastructureError

**HTTP Status:** `500 Internal Server Error` or `503 Service Unavailable`

**Description:**  
Errors that occur due to system failures, infrastructure issues, or unexpected errors.

**Common Causes:**
- Database connection failures
- External service unavailability
- System resource exhaustion
- Unexpected exceptions

**Example:**
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Ocorreu um erro interno. Por favor, tente novamente mais tarde",
    "http_status": 500,
    "details": {
      "error_type": "database_connection_failure"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### AuthenticationError

**HTTP Status:** `401 Unauthorized`

**Description:**  
Errors that occur when authentication fails or is missing.

**Common Causes:**
- Missing authentication token
- Invalid or expired token
- Invalid credentials
- Account locked

**Example:**
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email ou palavra-passe inválidos",
    "http_status": 401,
    "details": {},
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### RateLimitError

**HTTP Status:** `429 Too Many Requests`

**Description:**  
Errors that occur when rate limits are exceeded.

**Common Causes:**
- Too many login attempts
- Too many API requests
- Too many password reset requests

**Example:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Muitas tentativas de login. Por favor, tente novamente mais tarde",
    "http_status": 429,
    "details": {
      "limit": 5,
      "window": "15 minutes",
      "retry_after": 900
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### AccountLockedError

**HTTP Status:** `423 Locked`

**Description:**  
Errors that occur when an account is temporarily locked.

**Common Causes:**
- Too many failed login attempts
- Account lockout policy triggered

**Example:**
```json
{
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Conta temporariamente bloqueada devido a múltiplas tentativas de login falhadas. Por favor, tente novamente mais tarde",
    "http_status": 423,
    "details": {
      "lockout_duration": "30 minutes",
      "unlock_at": "2024-01-15T11:00:00Z"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## Domain-Specific Errors by Module

### Authentication & Users Module

| Error Code | HTTP Status | Message (PT-PT) | Category | Details |
|------------|-------------|-----------------|----------|---------|
| `INVALID_EMAIL` | 400 | Formato de email inválido | ValidationError | Field: email |
| `MISSING_PASSWORD` | 400 | Palavra-passe é obrigatória | ValidationError | Field: password |
| `INVALID_CREDENTIALS` | 401 | Email ou palavra-passe inválidos | AuthenticationError | Generic message for security |
| `NO_ROLES` | 403 | A conta de utilizador não tem papéis atribuídos | PermissionDeniedError | User has no roles |
| `ACCOUNT_LOCKED` | 423 | Conta temporariamente bloqueada. Por favor, tente novamente mais tarde | AccountLockedError | Account lockout |
| `RATE_LIMIT_EXCEEDED` | 429 | Muitas tentativas de login. Por favor, tente novamente mais tarde | RateLimitError | Login rate limit |
| `INVALID_TOKEN` | 401 | Token inválido ou expirado | AuthenticationError | Invalid/expired token |
| `TOKEN_EXPIRED` | 401 | Token expirado | AuthenticationError | Token expiration |
| `DUPLICATE_EMAIL` | 409 | Já existe um utilizador com este endereço de email | ConflictError | Field: email |
| `DUPLICATE_USERNAME` | 409 | Já existe um utilizador com este nome de utilizador | ConflictError | Field: username |
| `INVALID_ROLE` | 400 | ID de papel inválido: [role] | ValidationError | Field: roles |
| `OWNER_ROLE_RESTRICTED` | 403 | Apenas utilizadores com papel de Proprietário podem criar utilizadores Proprietário | PermissionDeniedError | Role restriction |
| `USER_NOT_FOUND` | 404 | Utilizador não encontrado | NotFoundError | Resource: user |
| `INVALID_WORKING_HOURS` | 400 | Horário de trabalho deve conter todos os 7 dias | ValidationError | Field: working_hours |
| `INVALID_TIME_FORMAT` | 400 | Hora deve estar no formato HH:MM | ValidationError | Field: time |
| `PASSWORD_TOO_WEAK` | 400 | A palavra-passe não cumpre os requisitos de complexidade | ValidationError | Password rules |
| `RESET_TOKEN_INVALID` | 401 | Token de redefinição de palavra-passe inválido ou expirado | AuthenticationError | Reset token |
| `RESET_TOKEN_EXPIRED` | 401 | Token de redefinição de palavra-passe expirado | AuthenticationError | Token expiration |
| `RESET_TOKEN_USED` | 401 | Token de redefinição de palavra-passe já foi utilizado | AuthenticationError | Token already used |
| `SESSION_NOT_FOUND` | 404 | Sessão não encontrada | NotFoundError | Resource: session |
| `ROLE_NOT_FOUND` | 404 | Papel não encontrado | NotFoundError | Resource: role |

---

### Administrative Module

| Error Code | HTTP Status | Message (PT-PT) | Category | Details |
|------------|-------------|-----------------|----------|---------|
| `INVALID_NIF` | 400 | Formato de NIF inválido. Deve ter 9 dígitos e passar na validação de NIF português | ValidationError | Field: nif |
| `DUPLICATE_NIF` | 409 | Já existe uma empresa com este NIF | ConflictError | Field: nif |
| `MISSING_REQUIRED_FIELD` | 400 | Campo obrigatório [field] está em falta | ValidationError | Field name in details |
| `INVALID_ADDRESS` | 400 | Estrutura de endereço inválida. Deve conter rua, cidade e código postal | ValidationError | Field: address |
| `INVALID_POSTAL_CODE` | 400 | Código postal inválido. Deve estar no formato XXXX-XXX | ValidationError | Field: postal_code |
| `INVALID_VAT_RATE` | 400 | Taxa de IVA deve estar entre 0.00 e 100.00 | ValidationError | Field: vat_rate |
| `COMPANY_NOT_FOUND` | 404 | Empresa não encontrada | NotFoundError | Resource: company |
| `STORE_NOT_FOUND` | 404 | Loja não encontrada | NotFoundError | Resource: store |
| `STORE_COMPANY_MISMATCH` | 400 | A loja não pertence à empresa especificada | BusinessRuleError | Store/company relationship |
| `CUSTOMER_NOT_FOUND` | 404 | Cliente não encontrado | NotFoundError | Resource: customer |
| `CUSTOMER_ARCHIVED` | 400 | Cliente está arquivado | BusinessRuleError | Customer status |
| `PET_NOT_FOUND` | 404 | Animal de estimação não encontrado | NotFoundError | Resource: pet |
| `PET_CUSTOMER_MISMATCH` | 400 | O animal de estimação não pertence ao cliente especificado | BusinessRuleError | Pet/customer relationship |
| `INVALID_NAME` | 400 | Nome não pode estar vazio | ValidationError | Field: name |
| `INVALID_PHONE` | 400 | Formato de telefone inválido | ValidationError | Field: phone |
| `INVALID_DATE` | 400 | Data inválida | ValidationError | Field: date |
| `DATE_IN_FUTURE` | 400 | Data não pode ser no futuro | ValidationError | Field: date |
| `INVALID_MICROCHIP` | 400 | Formato de microchip inválido | ValidationError | Field: microchip_id |
| `DUPLICATE_MICROCHIP` | 409 | Já existe um animal de estimação com este número de microchip | ConflictError | Field: microchip_id |
| `CUSTOMER_HAS_PETS` | 400 | Não é possível arquivar cliente com animais de estimação associados | BusinessRuleError | Customer has pets |
| `CUSTOMER_HAS_APPOINTMENTS` | 400 | Não é possível arquivar cliente com marcações associadas | BusinessRuleError | Customer has appointments |
| `STORE_HAS_STAFF` | 400 | Não é possível eliminar loja com funcionários atribuídos | BusinessRuleError | Store has staff |
| `STORE_HAS_INVENTORY` | 400 | Não é possível eliminar loja com inventário | BusinessRuleError | Store has inventory |
| `INVALID_OPENING_HOURS` | 400 | Horário de funcionamento deve conter todos os 7 dias da semana | ValidationError | Field: opening_hours |
| `INVALID_TIMEZONE` | 400 | Fuso horário inválido | ValidationError | Field: timezone |
| `IMPORT_FILE_INVALID` | 400 | Ficheiro de importação inválido | ValidationError | File format |
| `IMPORT_FILE_TOO_LARGE` | 400 | Ficheiro de importação demasiado grande | ValidationError | File size |
| `IMPORT_ROW_ERROR` | 400 | Erro na linha [row]: [error] | ValidationError | Import row number |

---

### Services Module

| Error Code | HTTP Status | Message (PT-PT) | Category | Details |
|------------|-------------|-----------------|----------|---------|
| `SERVICE_NOT_FOUND` | 404 | Serviço não encontrado | NotFoundError | Resource: service |
| `INVALID_DURATION` | 400 | Duração deve ser maior que 0 | ValidationError | Field: duration_minutes |
| `INVALID_PRICE` | 400 | Preço unitário deve ser >= 0 | ValidationError | Field: price |
| `MISSING_CONSUMED_ITEMS` | 400 | Serviços que consomem inventário devem especificar itens consumidos | ValidationError | Field: consumed_items |
| `INVALID_CONSUMED_ITEMS` | 400 | Itens consumidos inválidos | ValidationError | Field: consumed_items |
| `APPOINTMENT_NOT_FOUND` | 404 | Marcação não encontrada | NotFoundError | Resource: appointment |
| `APPOINTMENT_CONFLICT` | 409 | Conflito de marcação. Já existe uma marcação neste horário | ConflictError | Time conflict |
| `APPOINTMENT_DOUBLE_BOOKING` | 409 | Funcionário já tem uma marcação neste horário | ConflictError | Staff double-booking |
| `APPOINTMENT_OUTSIDE_HOURS` | 400 | Marcação fora do horário de funcionamento da loja | BusinessRuleError | Store hours |
| `APPOINTMENT_STAFF_UNAVAILABLE` | 400 | Funcionário não está disponível neste horário | BusinessRuleError | Staff availability |
| `APPOINTMENT_INVALID_STATUS` | 400 | Estado de marcação inválido para esta operação | BusinessRuleError | Status transition |
| `APPOINTMENT_ALREADY_COMPLETED` | 400 | Marcação já está concluída | BusinessRuleError | Status: completed |
| `APPOINTMENT_ALREADY_CANCELLED` | 400 | Marcação já está cancelada | BusinessRuleError | Status: cancelled |
| `APPOINTMENT_CANNOT_CANCEL` | 400 | Não é possível cancelar marcação concluída | BusinessRuleError | Status restriction |
| `INVALID_START_TIME` | 400 | Hora de início inválida | ValidationError | Field: start_at |
| `INVALID_END_TIME` | 400 | Hora de fim inválida | ValidationError | Field: end_at |
| `END_BEFORE_START` | 400 | Hora de fim deve ser após hora de início | ValidationError | Time validation |
| `PAST_APPOINTMENT` | 400 | Não é possível criar marcação no passado | ValidationError | Date validation |
| `INVALID_RECURRENCE` | 400 | Padrão de recorrência inválido | ValidationError | Field: recurrence |
| `SERVICE_PACKAGE_NOT_FOUND` | 404 | Pacote de serviços não encontrado | NotFoundError | Resource: service_package |
| `INVALID_SERVICE_QUANTITY` | 400 | Quantidade de serviço deve ser >= 1 | ValidationError | Field: quantity |
| `RESOURCE_CONFLICT` | 409 | Recurso já está em uso (ex: estação de tosquia) | ConflictError | Resource availability |

---

### Financial Module

| Error Code | HTTP Status | Message (PT-PT) | Category | Details |
|------------|-------------|-----------------|----------|---------|
| `INVOICE_NOT_FOUND` | 404 | Fatura não encontrada | NotFoundError | Resource: invoice |
| `INVOICE_NOT_DRAFT` | 400 | A fatura não está em estado de rascunho. Apenas faturas em rascunho podem ser emitidas | BusinessRuleError | Status: draft required |
| `INVOICE_ALREADY_ISSUED` | 400 | Fatura já foi emitida | BusinessRuleError | Status: issued |
| `INVOICE_ALREADY_PAID` | 400 | Fatura já está paga | BusinessRuleError | Status: paid |
| `INVOICE_ALREADY_VOIDED` | 400 | Fatura já está anulada | BusinessRuleError | Status: voided |
| `INVOICE_CANNOT_EDIT` | 400 | Não é possível editar fatura emitida. Apenas faturas em rascunho podem ser editadas | BusinessRuleError | Status restriction |
| `INVOICE_CANNOT_VOID` | 400 | Não é possível anular fatura. Apenas faturas emitidas ou pagas podem ser anuladas | BusinessRuleError | Status restriction |
| `INVALID_INVOICE_NUMBER` | 400 | Número de fatura inválido | ValidationError | Field: invoice_number |
| `DUPLICATE_INVOICE_NUMBER` | 409 | Número de fatura já existe | ConflictError | Field: invoice_number |
| `INVOICE_NUMBER_GENERATION_FAILED` | 500 | Falha ao gerar número de fatura único | InfrastructureError | System error |
| `INVALID_COMPANY_NIF` | 400 | NIF da empresa é inválido ou está em falta. Não é possível emitir fatura sem NIF válido | BusinessRuleError | Company NIF |
| `MISSING_LINE_ITEMS` | 400 | Fatura deve ter pelo menos um item de linha | ValidationError | Field: lines |
| `INVALID_LINE_ITEM` | 400 | Item de linha inválido: [error] | ValidationError | Line item details |
| `INVALID_VAT_RATE` | 400 | Taxa de IVA deve estar entre 0.00 e 100.00 | ValidationError | Field: vat_rate |
| `INVALID_QUANTITY` | 400 | Quantidade deve ser maior que 0 | ValidationError | Field: quantity |
| `INVALID_UNIT_PRICE` | 400 | Preço unitário deve ser >= 0 | ValidationError | Field: unit_price |
| `CREDIT_NOTE_NOT_FOUND` | 404 | Nota de crédito não encontrada | NotFoundError | Resource: credit_note |
| `CREDIT_NOTE_AMOUNT_EXCEEDED` | 400 | Valor da nota de crédito excede o valor da fatura ou valor em aberto | BusinessRuleError | Amount validation |
| `CREDIT_NOTE_INVALID_INVOICE` | 400 | Nota de crédito só pode ser criada para faturas emitidas ou pagas | BusinessRuleError | Invoice status |
| `MISSING_CREDIT_NOTE_REASON` | 400 | Motivo da nota de crédito é obrigatório | ValidationError | Field: reason |
| `TRANSACTION_NOT_FOUND` | 404 | Transação não encontrada | NotFoundError | Resource: transaction |
| `TRANSACTION_ALREADY_COMPLETED` | 400 | Transação já está concluída | BusinessRuleError | Status: completed |
| `TRANSACTION_CANNOT_COMPLETE` | 400 | Não é possível concluir transação. Estado inválido | BusinessRuleError | Status restriction |
| `INVALID_PAYMENT_METHOD` | 400 | Método de pagamento inválido | ValidationError | Field: payment_method |
| `MISSING_PAYMENT_METHOD` | 400 | Método de pagamento é obrigatório | ValidationError | Field: payment_method |
| `INVALID_PAYMENT_DATE` | 400 | Data de pagamento inválida ou no futuro | ValidationError | Field: paid_at |
| `FINANCIAL_EXPORT_NOT_FOUND` | 404 | Exportação financeira não encontrada | NotFoundError | Resource: financial_export |
| `INVALID_EXPORT_PERIOD` | 400 | Período de exportação inválido. Data de início deve ser <= data de fim | ValidationError | Period dates |
| `EXPORT_PERIOD_TOO_LARGE` | 400 | Período de exportação excede o máximo permitido (1 ano) | ValidationError | Period range |
| `INVALID_EXPORT_FORMAT` | 400 | Formato de exportação inválido. Deve ser 'csv' ou 'json' | ValidationError | Field: format |
| `EXPORT_GENERATION_FAILED` | 500 | Falha ao gerar exportação financeira | InfrastructureError | System error |

---

### Inventory Module

| Error Code | HTTP Status | Message (PT-PT) | Category | Details |
|------------|-------------|-----------------|----------|---------|
| `PRODUCT_NOT_FOUND` | 404 | Produto não encontrado | NotFoundError | Resource: product |
| `DUPLICATE_SKU` | 409 | SKU já existe | ConflictError | Field: sku |
| `INVALID_SKU` | 400 | SKU inválido. Deve ter no máximo 64 caracteres | ValidationError | Field: sku |
| `INVALID_STOCK_TRACKED` | 400 | Flag de rastreamento de stock deve ser booleano | ValidationError | Field: stock_tracked |
| `INVALID_REORDER_THRESHOLD` | 400 | Limiar de reabastecimento deve ser >= 0 | ValidationError | Field: reorder_threshold |
| `SUPPLIER_NOT_FOUND` | 404 | Fornecedor não encontrado | NotFoundError | Resource: supplier |
| `STOCK_BATCH_NOT_FOUND` | 404 | Lote de stock não encontrado | NotFoundError | Resource: stock_batch |
| `INVALID_BATCH_NUMBER` | 400 | Número de lote inválido | ValidationError | Field: batch_number |
| `INVALID_EXPIRY_DATE` | 400 | Data de validade inválida ou no passado | ValidationError | Field: expiry_date |
| `EXPIRED_BATCH` | 400 | Lote expirado. Não é possível vender lote expirado | BusinessRuleError | Batch expiry |
| `INSUFFICIENT_STOCK` | 409 | Stock insuficiente. Disponível: [quantity], Solicitado: [quantity] | ConflictError | Stock availability |
| `NEGATIVE_STOCK_BLOCKED` | 400 | Ajuste resultaria em stock negativo. Stock atual: [quantity] | BusinessRuleError | Stock constraint |
| `ZERO_QUANTITY` | 400 | Alteração de quantidade não pode ser zero | ValidationError | Field: quantity_change |
| `INVALID_QUANTITY` | 400 | Quantidade deve ser maior que 0 | ValidationError | Field: quantity |
| `MISSING_ADJUSTMENT_REASON` | 400 | Motivo do ajuste de stock é obrigatório | ValidationError | Field: reason |
| `ADJUSTMENT_REASON_TOO_LONG` | 400 | Motivo do ajuste não pode exceder 255 caracteres | ValidationError | Field: reason |
| `STOCK_MOVEMENT_NOT_FOUND` | 404 | Movimento de stock não encontrado | NotFoundError | Resource: stock_movement |
| `INVALID_MOVEMENT_REASON` | 400 | Motivo de movimento inválido | ValidationError | Field: reason |
| `INVENTORY_RESERVATION_NOT_FOUND` | 404 | Reserva de inventário não encontrada | NotFoundError | Resource: inventory_reservation |
| `RESERVATION_ALREADY_RELEASED` | 409 | Reserva já foi libertada | ConflictError | Reservation status |
| `RESERVATION_ALREADY_CONSUMED` | 409 | Reserva já foi consumida | ConflictError | Reservation status |
| `RESERVATION_EXPIRED` | 400 | Reserva expirada | BusinessRuleError | Reservation expiry |
| `INVALID_RESERVATION_TYPE` | 400 | Tipo de reserva inválido. Deve ser 'appointment' ou 'transaction' | ValidationError | Field: reserved_for_type |
| `PURCHASE_ORDER_NOT_FOUND` | 404 | Ordem de compra não encontrada | NotFoundError | Resource: purchase_order |
| `PO_NOT_RECEIVABLE` | 400 | Ordem de compra não pode ser recebida. Estado: [status] | BusinessRuleError | PO status |
| `PO_ALREADY_RECEIVED` | 400 | Ordem de compra já foi recebida | BusinessRuleError | PO status |
| `PO_OVER_RECEIVE` | 400 | Quantidade recebida excede quantidade encomendada | BusinessRuleError | Receiving quantity |
| `PO_LINE_NOT_FOUND` | 404 | Linha de ordem de compra não encontrada | NotFoundError | Resource: po_line |
| `INVALID_RECEIVED_QUANTITY` | 400 | Quantidade recebida inválida. Deve ser > 0 e <= quantidade encomendada | ValidationError | Field: quantity |
| `STOCK_RECONCILIATION_FAILED` | 500 | Falha ao processar reconciliação de stock | InfrastructureError | System error |
| `INVALID_COUNT_QUANTITY` | 400 | Quantidade contada deve ser >= 0 | ValidationError | Field: counted_quantity |
| `PRODUCT_NOT_STOCK_TRACKED` | 400 | Produto não tem rastreamento de stock ativado | BusinessRuleError | Product configuration |
| `LOCATION_NOT_FOUND` | 404 | Localização de inventário não encontrada | NotFoundError | Resource: inventory_location |
| `LOCATION_STORE_MISMATCH` | 400 | Localização não pertence à loja especificada | BusinessRuleError | Location/store relationship |

---

## Error Payload Examples

### Example 1: Validation Error

**Request:**
```http
POST /api/companies
Content-Type: application/json

{
  "name": "Patacão",
  "nif": "123"
}
```

**Response:**
```json
{
  "error": {
    "code": "INVALID_NIF",
    "message": "Formato de NIF inválido. Deve ter 9 dígitos e passar na validação de NIF português",
    "http_status": 400,
    "details": {
      "field": "nif",
      "value": "123",
      "constraint": "Deve ter exatamente 9 dígitos e passar no algoritmo de validação de NIF português"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### Example 2: Business Rule Error

**Request:**
```http
POST /api/invoices/bb0e8400-e29b-41d4-a716-446655440000/issue
```

**Response:**
```json
{
  "error": {
    "code": "INVOICE_NOT_DRAFT",
    "message": "A fatura não está em estado de rascunho. Apenas faturas em rascunho podem ser emitidas",
    "http_status": 400,
    "details": {
      "invoice_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "current_status": "issued",
      "required_status": "draft"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### Example 3: Not Found Error

**Request:**
```http
GET /api/customers/770e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "error": {
    "code": "CUSTOMER_NOT_FOUND",
    "message": "Cliente não encontrado",
    "http_status": 404,
    "details": {
      "resource": "customer",
      "id": "770e8400-e29b-41d4-a716-446655440000"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### Example 4: Permission Denied Error

**Request:**
```http
POST /api/companies
Authorization: Bearer <manager_token>
Content-Type: application/json

{
  "name": "Patacão",
  "nif": "123456789"
}
```

**Response:**
```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Não tem permissão para criar perfis de empresa. Apenas utilizadores com papel de Proprietário podem criar perfis de empresa",
    "http_status": 403,
    "details": {
      "required_role": "Owner",
      "user_role": "Manager",
      "action": "company:create"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### Example 5: Conflict Error

**Request:**
```http
POST /api/users
Content-Type: application/json

{
  "email": "existing@patacao.pt",
  "full_name": "New User",
  "roles": ["Staff"]
}
```

**Response:**
```json
{
  "error": {
    "code": "DUPLICATE_EMAIL",
    "message": "Já existe um utilizador com este endereço de email",
    "http_status": 409,
    "details": {
      "field": "email",
      "value": "existing@patacao.pt",
      "existing_resource": "user"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### Example 6: Account Locked Error

**Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "staff@patacao.pt",
  "password": "wrongpassword"
}
```

**Response:**
```json
{
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Conta temporariamente bloqueada devido a múltiplas tentativas de login falhadas. Por favor, tente novamente mais tarde",
    "http_status": 423,
    "details": {
      "lockout_duration": "30 minutes",
      "unlock_at": "2024-01-15T11:00:00Z"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### Example 7: Rate Limit Error

**Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "staff@patacao.pt",
  "password": "password"
}
```

**Response:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Muitas tentativas de login. Por favor, tente novamente mais tarde",
    "http_status": 429,
    "details": {
      "limit": 5,
      "window": "15 minutes",
      "retry_after": 900
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### Example 8: Infrastructure Error

**Request:**
```http
POST /api/invoices/bb0e8400-e29b-41d4-a716-446655440000/issue
```

**Response:**
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Ocorreu um erro interno. Por favor, tente novamente mais tarde",
    "http_status": 500,
    "details": {
      "error_type": "database_connection_failure",
      "reference": "ERR-2024-001-550e8400"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### Example 9: Multiple Validation Errors

**Request:**
```http
POST /api/products
Content-Type: application/json

{
  "name": "",
  "unit_price": -10.00,
  "vat_rate": 150.00
}
```

**Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERRORS",
    "message": "Erros de validação encontrados",
    "http_status": 400,
    "details": {
      "errors": [
        {
          "field": "name",
          "code": "INVALID_NAME",
          "message": "Nome não pode estar vazio"
        },
        {
          "field": "unit_price",
          "code": "INVALID_PRICE",
          "message": "Preço unitário deve ser >= 0"
        },
        {
          "field": "vat_rate",
          "code": "INVALID_VAT_RATE",
          "message": "Taxa de IVA deve estar entre 0.00 e 100.00"
        }
      ]
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## Error Handling Best Practices

### Security Considerations

1. **Generic Error Messages:** Authentication errors return generic messages to prevent user enumeration
2. **No Information Leakage:** Error messages do not reveal system internals or sensitive information
3. **Request ID Tracking:** All errors include request_id for support and debugging
4. **Audit Logging:** Security-relevant errors are logged in audit system

### User Experience

1. **Clear Messages:** Error messages are clear and actionable in Portuguese (Portugal)
2. **Field-Level Details:** Validation errors specify the problematic field
3. **Constraint Information:** Error details include violated constraints
4. **Retry Guidance:** Rate limit and lockout errors include retry information

### Developer Experience

1. **Consistent Structure:** All errors follow the same structure
2. **Machine-Readable Codes:** Error codes are consistent and machine-readable
3. **Request Tracing:** Request IDs enable error tracking and debugging
4. **Detailed Context:** Error details provide context for debugging

---

## HTTP Status Code Mapping

| HTTP Status | Error Category | Usage |
|-------------|----------------|-------|
| 400 | ValidationError, BusinessRuleError | Bad request, invalid input, business rule violation |
| 401 | AuthenticationError | Unauthorized, authentication required |
| 403 | PermissionDeniedError | Forbidden, insufficient permissions |
| 404 | NotFoundError | Resource not found |
| 409 | ConflictError | Conflict, duplicate, concurrent modification |
| 422 | BusinessRuleError | Unprocessable entity, business rule violation |
| 423 | AccountLockedError | Locked, account temporarily locked |
| 429 | RateLimitError | Too many requests, rate limit exceeded |
| 500 | InfrastructureError | Internal server error, system failure |
| 503 | InfrastructureError | Service unavailable, external service failure |

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

