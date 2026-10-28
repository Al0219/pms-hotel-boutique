import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import { count, list, text } from '@/lib/validation';
import { roomPresentationFor } from '@/modules/availability';
import type { ReservationLookupDTO } from '../dtos/reservation-lookup.dto';
import type { ReservationLookup } from '../model/reservation-lookup';
import { mapLinkedGuestReservations, mapGuestStay } from './linked-guest-reservation.mapper';

export function mapReservationLookup(dto: ReservationLookupDTO, reference: string): ReservationLookup {
  const rows = mapLinkedGuestReservations(dto?.stays);
  const reservation = rows[0];
  if (rows.length !== 1 || reservation.reference.toUpperCase() !== reference.trim().toUpperCase()) {
    throw new DomainMappingError('RESERVATION_LOOKUP_SCOPE_MISMATCH');
  }
  const detailRows = list(dto.details);
  if (detailRows.length !== reservation.stays.length || new Set(detailRows.map(item => item.id)).size !== detailRows.length) {
    throw new DomainMappingError('RESERVATION_LOOKUP_STAY_MISMATCH');
  }
  const details = reservation.stays.map(stay => {
    const detail = detailRows.find(item => item.id === stay.id);
    if (!detail) throw new DomainMappingError('RESERVATION_LOOKUP_STAY_MISMATCH');
    const mapped = mapGuestStay(detail, reservation.id, stay.id);
    if (mapped.arrival !== stay.arrival || mapped.departure !== stay.departure || mapped.status !== stay.status ||
        (mapped.room?.code ?? null) !== stay.roomCode) throw new DomainMappingError('RESERVATION_LOOKUP_STAY_MISMATCH');
    return mapped;
  });
  const overview = dto.overview;
  const createdAt = text(overview?.createdAt);
  if (!/Z$/.test(createdAt) || !Number.isFinite(Date.parse(createdAt))) throw new DomainMappingError('INVALID_LOOKUP_CREATED_AT');
  const currency = text(overview.currency);
  if (!/^[A-Z]{3}$/.test(currency)) throw new DomainMappingError('INVALID_LOOKUP_CURRENCY');
  const confirmedTotalMinor = overview.confirmedTotalMinor === null ? null : count(overview.confirmedTotalMinor);
  const presentationRows = list(dto.accommodations);
  if (presentationRows.length !== details.length || new Set(presentationRows.map(item => item.stayId)).size !== details.length) {
    throw new DomainMappingError('RESERVATION_LOOKUP_PRESENTATION_MISMATCH');
  }
  const accommodations = details.map(stay => {
    const item = presentationRows.find(item => item.stayId === stay.id);
    if (!item) throw new DomainMappingError('RESERVATION_LOOKUP_PRESENTATION_MISMATCH');
    const timezone = text(item.timezone), roomTypeCode = text(item.roomTypeCode);
    try { new Intl.DateTimeFormat('es-GT', { timeZone: timezone }); }
    catch { throw new DomainMappingError('INVALID_LOOKUP_TIMEZONE'); }
    const presentation = roomPresentationFor(roomTypeCode);
    return { ...stay, timezone, roomTypeCode, images: [...(presentation?.images ?? [])], description: presentation?.description ?? null };
  });
  return { reservation, details, accommodations, overview: { createdAt, currency, confirmedTotalMinor, source: overview.source === null ? null : text(overview.source) } };
}
