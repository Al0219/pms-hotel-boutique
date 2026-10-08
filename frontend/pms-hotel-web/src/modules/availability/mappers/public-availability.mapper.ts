import { DomainMappingError } from '@/lib/errors';
import type { PublicAvailabilityResponseDTO } from '../dtos/public-availability.dto';
import type { AvailabilitySearchResult } from '../model/availability-option';
import { roomPresentationFor } from '../content/public-room-metadata';

const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const text = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim());
const date = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

/** Preserve Backend identities and quotes; only convert minor units for display. */
export function mapPublicAvailabilityToDomain(dto: PublicAvailabilityResponseDTO): AvailabilitySearchResult {
  if (!dto || !uuid(dto.propertyId)) throw new DomainMappingError('INVALID_PUBLIC_PROPERTY_ID');
  if (!date(dto.arrival) || !date(dto.departure) || dto.arrival >= dto.departure) throw new DomainMappingError('INVALID_STAY_DATES');
  if (dto.currency !== 'GTQ') throw new DomainMappingError('INVALID_PUBLIC_CURRENCY');
  if (!Array.isArray(dto.offers)) throw new DomainMappingError('MISSING_PUBLIC_OFFERS');
  const seen = new Set<string>();
  const roomTypes = dto.offers.map(offer => {
    if (!offer || !uuid(offer.roomTypeId) || !text(offer.roomTypeCode) || !text(offer.roomTypeName) ||
        !text(offer.ratePlanId) || !text(offer.ratePlanCode)) throw new DomainMappingError('INVALID_PUBLIC_OFFER_IDENTITY');
    if (seen.has(offer.roomTypeId)) throw new DomainMappingError('DUPLICATE_PUBLIC_ROOM_TYPE');
    seen.add(offer.roomTypeId);
    if (!Number.isSafeInteger(offer.availableUnits) || offer.availableUnits <= 0) throw new DomainMappingError('INVALID_AVAILABLE_UNITS');
    if (![offer.nightlyRateMinor, offer.totalMinor].every(value => Number.isSafeInteger(value) && value >= 0)) throw new DomainMappingError('INVALID_PUBLIC_MINOR_UNITS');
    const presentation = roomPresentationFor(offer.roomTypeCode);
    return {
      roomTypeId: offer.roomTypeId, code: offer.roomTypeCode, name: offer.roomTypeName,
      description: presentation?.description ?? null, images: [...(presentation?.images ?? [])],
      category: presentation?.category, maxOccupancy: null,
      availableRoomsCount: offer.availableUnits,
      ratePlans: [{
        ratePlanId: offer.ratePlanId, ratePlanCode: offer.ratePlanCode, name: offer.ratePlanCode,
        description: null, currency: dto.currency, nightlyRateMinor: offer.nightlyRateMinor,
        totalMinor: offer.totalMinor, baseNightlyRate: offer.nightlyRateMinor / 100,
        totalAmount: offer.totalMinor / 100, cancellationPolicy: null, mealsIncluded: null,
      }],
    };
  });
  return {
    propertyId: dto.propertyId, checkInDate: dto.arrival, checkOutDate: dto.departure,
    totalNights: (Date.parse(`${dto.departure}T00:00:00Z`) - Date.parse(`${dto.arrival}T00:00:00Z`)) / 86400000,
    roomTypes,
  };
}
