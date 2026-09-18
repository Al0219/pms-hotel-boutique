import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { IntegrationDto } from "../dtos/integration.dto";
import type { Integration } from "../model/integration";
import { isIntegrationCategory, isIntegrationHealth } from "../model/integration-taxonomy";

function requiredText(value: string, errorCode: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new DomainMappingError(errorCode);
  }

  return normalizedValue;
}

function optionalText(value: string | null): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue || null;
}

function mapCapabilities(values: string[]): ReadonlyArray<string> {
  return values.map((capability) => capability.trim()).filter((capability) => capability.length > 0);
}

export function mapIntegration(dto: IntegrationDto): Integration {
  const category = dto.category.trim();
  const health = dto.health.trim();

  if (!isIntegrationCategory(category)) {
    throw new DomainMappingError("INVALID_INTEGRATION_CATEGORY");
  }

  if (!isIntegrationHealth(health)) {
    throw new DomainMappingError("INVALID_INTEGRATION_HEALTH");
  }

  return {
    id: requiredText(dto.integration_id, "INVALID_INTEGRATION_ID"),
    propertyId: requiredText(dto.property_id, "INVALID_INTEGRATION_PROPERTY_ID"),
    category,
    provider: requiredText(dto.provider, "INVALID_INTEGRATION_PROVIDER"),
    adapter: optionalText(dto.adapter),
    health,
    lastSync: optionalText(dto.last_sync),
    capabilities: mapCapabilities(dto.capabilities),
  };
}
