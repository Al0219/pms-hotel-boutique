import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { optionalText, parseCount, parseDateTime, requiredText } from "@/lib/mapper";

import type { IntegrationErrorDto, IntegrationErrorEventDto } from "../dtos/integration-error.dto";
import { isIntegrationErrorStatus, type IntegrationError, type IntegrationErrorEvent } from "../model/integration-error";

function mapErrorEvent(dto: IntegrationErrorEventDto): IntegrationErrorEvent {
  const status = dto.status.trim();

  if (!isIntegrationErrorStatus(status)) {
    throw new DomainMappingError("INVALID_INTEGRATION_ERROR_EVENT_STATUS");
  }

  return {
    status,
    at: parseDateTime(dto.at, "INVALID_INTEGRATION_ERROR_EVENT_DATE"),
    note: optionalText(dto.note),
  };
}

function optionalDateTime(value: string | null, errorCode: string): Date | null {
  if (value === null) {
    return null;
  }
  return parseDateTime(value, errorCode);
}

export function mapIntegrationError(dto: IntegrationErrorDto): IntegrationError {
  const status = dto.status.trim();

  if (!isIntegrationErrorStatus(status)) {
    throw new DomainMappingError("INVALID_INTEGRATION_ERROR_STATUS");
  }

  return {
    id: requiredText(dto.error_id, "INVALID_INTEGRATION_ERROR_ID"),
    propertyId: requiredText(dto.property_id, "INVALID_INTEGRATION_ERROR_PROPERTY_ID"),
    integrationId: requiredText(dto.integration_id, "INVALID_INTEGRATION_ERROR_INTEGRATION_ID"),
    integrationProvider: requiredText(dto.integration_provider, "INVALID_INTEGRATION_ERROR_PROVIDER"),
    kind: requiredText(dto.kind, "INVALID_INTEGRATION_ERROR_KIND"),
    message: requiredText(dto.message, "INVALID_INTEGRATION_ERROR_MESSAGE"),
    status,
    attempts: parseCount(dto.attempts, "INVALID_INTEGRATION_ERROR_ATTEMPTS"),
    maxAttempts: parseCount(dto.max_attempts, "INVALID_INTEGRATION_ERROR_MAX_ATTEMPTS"),
    retryable: dto.retryable,
    lastAttemptAt: optionalDateTime(dto.last_attempt_at, "INVALID_INTEGRATION_ERROR_DATE"),
    history: dto.history.map(mapErrorEvent),
  };
}
