import { getPublicEnvironment } from '@/lib/env';
import { HttpStatusError } from '@/lib/http';
import { DomainMappingError } from '@/lib/errors';
import { mapPublicAvailabilityToDomain } from '../mappers/public-availability.mapper';
import { mapAvailabilityResponseToDomain, mapSearchParamsToQueryDto } from '../mappers/availability.mapper';
import { fetchAvailabilityDto, fetchBackendAvailabilityDto } from './availability.service';
import type { AvailabilitySearchParams } from '../model/availability-option';

/** The same authoritative read is used by queries and atomic search changes. */
export async function getPublicAvailability(params: AvailabilitySearchParams, signal?: AbortSignal) {
  const mock = getPublicEnvironment().useMockApi;
  const propertyId = params.propertyId ?? (mock ? undefined : process.env.NEXT_PUBLIC_PROPERTY_ID?.trim());
  if (!mock && !propertyId) throw new HttpStatusError(503, 'Public Property configuration required');
  const result = mock
    ? mapAvailabilityResponseToDomain(await fetchAvailabilityDto(mapSearchParamsToQueryDto(params), signal))
    : mapPublicAvailabilityToDomain(await fetchBackendAvailabilityDto({ propertyId: propertyId!, arrival: params.checkInDate, departure: params.checkOutDate, rooms: params.roomsCount }, signal));
  if (result.checkInDate !== params.checkInDate || result.checkOutDate !== params.checkOutDate || (propertyId && result.propertyId !== propertyId)) {
    throw new DomainMappingError('AVAILABILITY_SEARCH_MISMATCH');
  }
  return result;
}
