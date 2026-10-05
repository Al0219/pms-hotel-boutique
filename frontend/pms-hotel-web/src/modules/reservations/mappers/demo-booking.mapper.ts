import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import { count, dateOnly, list, object, text } from '@/lib/validation';
import { mapPaymentGuaranteeDtoToDomain } from '@/modules/payments';
import type { DemoBookingConfirmationDTO } from '../dtos/demo-booking.dto';
import type { DemoBookingConfirmation, DemoBookingRequest } from '../model/demo-booking';

export function mapDemoBooking(dto: DemoBookingConfirmationDTO, request: DemoBookingRequest): DemoBookingConfirmation {
  const value = object(dto);
  const result = {
    reservationId: text(value.reservation_id), propertyId: text(value.property_id), arrival: dateOnly(value.arrival), departure: dateOnly(value.departure), confirmedAt: text(value.confirmed_at),
    currency: text(value.currency), totalMinor: count(value.total_minor), guaranteeMinor: count(value.guarantee_minor), remainingMinor: count(value.remaining_minor),
    stays: list(dto.stays).map(stay => ({ id: text(stay.stay_id), roomTypeId: text(stay.room_type_id), ratePlanId: text(stay.rate_plan_id), roomName: text(stay.room_name) })),
    guarantee: mapPaymentGuaranteeDtoToDomain(dto.guarantee),
  };
  if (value.status !== 'CONFIRMED' || !result.reservationId.startsWith('HB-') || !Number.isFinite(Date.parse(result.confirmedAt)) || !result.confirmedAt.endsWith('Z')) throw new DomainMappingError('INVALID_DEMO_CONFIRMATION');
  if (result.propertyId !== request.propertyId || result.arrival !== request.checkIn || result.departure !== request.checkOut || result.currency !== request.currency || result.totalMinor !== request.totalMinor || result.guaranteeMinor !== request.guaranteeMinor || result.remainingMinor + result.guaranteeMinor !== result.totalMinor) throw new DomainMappingError('BOOKING_SCOPE_OR_PRICE_MISMATCH');
  const expected = request.items.flatMap(item => Array.from({ length: item.quantity }, () => `${item.roomTypeId}:${item.ratePlanId}`)).sort();
  if (new Set(result.stays.map(stay => stay.id)).size !== result.stays.length || JSON.stringify(result.stays.map(stay => `${stay.roomTypeId}:${stay.ratePlanId}`).sort()) !== JSON.stringify(expected)) throw new DomainMappingError('BOOKING_STAYS_MISMATCH');
  if (result.guarantee.status !== 'CAPTURED' || Math.round(result.guarantee.amount * 100) !== request.guaranteeMinor || result.guarantee.currency !== request.currency || !result.guarantee.providerReference || result.guarantee.last4 !== request.card.last4 || result.guarantee.cardBrand !== request.card.brand) throw new DomainMappingError('GUARANTEE_NOT_CONFIRMED');
  return result;
}
