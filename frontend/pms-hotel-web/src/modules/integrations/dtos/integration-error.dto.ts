/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 * Cola de errores de integración con reintento idempotente.
 */
export interface IntegrationErrorEventDto {
  /** Uno de PENDING | RETRYING | RESOLVED | FAILED. */
  status: string;
  /** ISO datetime. */
  at: string;
  note: string | null;
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface IntegrationErrorDto {
  error_id: string;
  property_id: string;
  integration_id: string;
  integration_provider: string;
  kind: string;
  message: string;
  /** Uno de PENDING | RETRYING | RESOLVED | FAILED. */
  status: string;
  attempts: number;
  max_attempts: number;
  retryable: boolean;
  /** ISO datetime. Null cuando nunca se intentó. */
  last_attempt_at: string | null;
  history: IntegrationErrorEventDto[];
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface IntegrationErrorListDto {
  errors: IntegrationErrorDto[];
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 * El reintento es idempotente por clave: repetir la misma clave no duplica
 * side effects ni historial.
 */
export interface RetryIntegrationErrorRequestDto {
  idempotency_key: string;
}
