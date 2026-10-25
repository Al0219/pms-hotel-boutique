import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import { isUtcInstant } from '@/lib/utc-instant';
import type { StaffBookingQuoteDto, StaffBookingReceiptDto } from '../dtos/staff-booking.dto';
import type { StaffBookingSearch, StaffBookingQuote, StaffBookingReceipt } from '../model/staff-booking';
import { stayNights } from '../model/staff-reservation-create';

const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
const number = (value: unknown, min = 1): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DomainMappingError('INVALID_STAFF_BOOKING');
  return value as Record<string, unknown>;
}
export function mapStaffBookingQuote(value: StaffBookingQuoteDto | unknown, propertyId: string, search: StaffBookingSearch): StaffBookingQuote {
  const dto = object(value);
  const nights = stayNights(search.arrival, search.departure);
  if (!uuid(propertyId) || dto.propertyId !== propertyId || dto.arrival !== search.arrival || dto.departure !== search.departure
    || !number(search.rooms) || dto.rooms !== search.rooms || !nights || dto.nights !== nights || dto.currency !== 'GTQ' || !Array.isArray(dto.options))
    throw new DomainMappingError('STAFF_BOOKING_QUOTE_SCOPE_MISMATCH');
  const keys = new Set<string>();
  const options = dto.options.map(value => {
    const item = object(value);
    if (!uuid(item.roomTypeId) || typeof item.roomTypeName !== 'string' || !item.roomTypeName.trim()
      || typeof item.ratePlanId !== 'string' || !item.ratePlanId.trim() || item.ratePlanId.length > 64
      || !number(item.availableRooms) || item.availableRooms < search.rooms || !number(item.nightlyMinor) || !number(item.totalMinor)
      || item.totalMinor !== item.nightlyMinor * nights * search.rooms || keys.has(item.roomTypeId))
      throw new DomainMappingError('INVALID_STAFF_BOOKING_OPTION');
    keys.add(item.roomTypeId);
    return { roomTypeId: item.roomTypeId, roomTypeName: item.roomTypeName, ratePlanId: item.ratePlanId,
      availableRooms: item.availableRooms, nightlyMinor: item.nightlyMinor, totalMinor: item.totalMinor };
  });
  return { propertyId, ...search, nights, currency: dto.currency, options };
}
export function mapStaffBookingReceipt(value: StaffBookingReceiptDto | unknown, propertyId: string): StaffBookingReceipt {
  const dto = object(value);
  if (dto.propertyId !== propertyId || !uuid(propertyId) || !uuid(dto.reservationId) || !uuid(dto.operationId) || !isUtcInstant(dto.completedAt))
    throw new DomainMappingError('INVALID_STAFF_BOOKING_RECEIPT');
  return { propertyId, reservationId: dto.reservationId, operationId: dto.operationId, completedAt: dto.completedAt };
}
