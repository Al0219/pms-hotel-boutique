import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { dateOnly, list, oneOf, text } from "@/lib/validation";
import type { GuestReservationListDTO } from "../dtos/guest-reservation.dto";
import type { GuestReservation } from "../model/guest-reservation";

export function mapGuestReservations(dto: GuestReservationListDTO, accountId: string): GuestReservation[] {
  if (text(dto.account_id) !== accountId) throw new DomainMappingError("ACCOUNT_SCOPE_MISMATCH");
  const reservationIds = new Set<string>();
  const stayIds = new Set<string>();
  return list(dto.reservations).map(item => {
    const id = text(item.reservation_id);
    if (reservationIds.has(id) || !list(item.stays).length) throw new DomainMappingError("INVALID_RESERVATION");
    reservationIds.add(id);
    return {
      id, propertyId: text(item.property_id), propertyName: text(item.property_name), bookingGuest: text(item.booking_guest),
      period: oneOf(item.period, ["CURRENT", "PAST"]), statusCode: text(item.status_code), statusLabel: text(item.status_label), policy: text(item.policy),
      stays: item.stays.map(stay => {
        const stayId = text(stay.stay_id);
        const arrival = dateOnly(stay.arrival), departure = dateOnly(stay.departure);
        if (stayIds.has(stayId) || departure <= arrival) throw new DomainMappingError("INVALID_STAY");
        stayIds.add(stayId);
        return { id: stayId, roomType: text(stay.room_type), arrival, departure, statusCode: text(stay.status_code), statusLabel: text(stay.status_label),
          occupants: list(stay.occupants).map(guest => ({ profileId: text(guest.guest_profile_id), name: text(guest.name) })) };
      }),
    };
  });
}
