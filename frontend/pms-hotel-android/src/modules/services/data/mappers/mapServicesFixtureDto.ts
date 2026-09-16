import { requireDtoField } from '@/data/mapping/requireDtoField';
import { DomainMappingError } from '@/domain/errors/DomainMappingError';
import {
  type ServiceCatalogItem,
  type ServiceRequestSubmission,
  type ServicesCatalog,
  type ServicesCatalogContext,
} from '@/modules/services/domain/models/ServiceCatalog';

import {
  type ServiceCatalogFixtureDto,
  type ServicesFixtureContext,
  type ServicesCatalogFixtureDto,
  type SubmitServiceRequestFixtureResult,
} from '@/modules/services/data/dtos/ServicesFixtureDto';

function requireNonBlankString(value: string, field: string): string {
  const requiredValue = requireDtoField(value, field);

  if (requiredValue.trim().length === 0) {
    throw new DomainMappingError(field);
  }

  return requiredValue;
}

function mapContext(dto: ServicesFixtureContext): ServicesCatalogContext {
  const context = requireDtoField(dto, 'services.context');

  return {
    currentStayFixtureKey: requireNonBlankString(
      context.currentStayFixtureKey,
      'services.context.currentStayFixtureKey',
    ),
    currentPropertyFixtureKey: requireNonBlankString(
      context.currentPropertyFixtureKey,
      'services.context.currentPropertyFixtureKey',
    ),
  };
}

function mapItem(dto: ServiceCatalogFixtureDto, index: number): ServiceCatalogItem {
  const item = requireDtoField(dto, `services.items[${index}]`);

  return {
    fixtureKey: requireNonBlankString(item.fixtureKey, `services.items[${index}].fixtureKey`),
    label: requireNonBlankString(item.label, `services.items[${index}].label`),
    detailText: requireNonBlankString(item.detailText, `services.items[${index}].detailText`),
    priceText: requireNonBlankString(item.priceText, `services.items[${index}].priceText`),
    ...(item.lateCheckoutUntil ? { lateCheckoutUntil: requireNonBlankString(item.lateCheckoutUntil, `services.items[${index}].lateCheckoutUntil`) } : {}),
  };
}

/** Purely maps the approved frontend fixture to a UI-safe catalog read model. */
export function mapServicesCatalogFixtureDto(
  dto: ServicesCatalogFixtureDto,
): ServicesCatalog {
  const catalog = requireDtoField(dto, 'services');
  const items = requireDtoField(catalog.items, 'services.items');

  return {
    context: mapContext(catalog.context),
    items: items.map(mapItem),
  };
}

/** Maps the mock acknowledgement without introducing a ServiceRequest entity. */
export function mapSubmitServiceRequestFixtureResult(
  dto: SubmitServiceRequestFixtureResult,
): ServiceRequestSubmission {
  const result = requireDtoField(dto, 'services.submitResult');

  return {
    serviceFixtureKey: requireNonBlankString(
      result.serviceFixtureKey,
      'services.submitResult.serviceFixtureKey',
    ),
  };
}
