import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import { text, dateOnly, list } from '@/lib/validation';
import type { LinkedGuestStayDTO, GuestStayDTO } from '../dtos/linked-guest-stay.dto';
import type { LinkedGuestReservation, GuestStay } from '../model/linked-guest-reservation';

export function mapLinkedGuestReservations(rows: LinkedGuestStayDTO[]): LinkedGuestReservation[] {
  const reservations = new Map<string, LinkedGuestReservation>();
  const seen = new Set<string>();
  for (const row of list(rows)) {
    const id = text(row.reservationId), stayId = text(row.stayId);
    const reference = text(row.confirmationCode), propertyName = text(row.propertyName), status = text(row.reservationStatus);
    const arrival = dateOnly(row.arrival), departure = dateOnly(row.departure);
    if (seen.has(stayId) || departure <= arrival) throw new DomainMappingError('INVALID_GUEST_STAY');
    seen.add(stayId);
    const reservation = reservations.get(id) ?? { id, reference, propertyName, status, stays: [] };
    if (reservation.reference !== reference || reservation.propertyName !== propertyName || reservation.status !== status) throw new DomainMappingError('INCONSISTENT_RESERVATION');
    reservation.stays.push({ id: stayId, arrival, departure, roomCode: row.roomCode === null ? null : text(row.roomCode), status: text(row.status) });
    reservations.set(id, reservation);
  }
  return [...reservations.values()];
}
export function mapGuestStay(dto: GuestStayDTO, reservationId: string, stayId: string): GuestStay {
  if (!dto || text(dto.id) !== stayId || text(dto.reservationId) !== reservationId) throw new DomainMappingError('GUEST_STAY_SCOPE_MISMATCH');
  const arrival = dateOnly(dto.arrival), departure = dateOnly(dto.departure);
  if (departure <= arrival) throw new DomainMappingError('INVALID_GUEST_STAY');
  return { id: stayId, reservationId, arrival, departure, status: text(dto.status),
    roomType: { id: text(dto.roomType?.id), name: text(dto.roomType?.name) },
    room: dto.room === null ? null : { id: text(dto.room?.id), code: text(dto.room?.code) } };
}
