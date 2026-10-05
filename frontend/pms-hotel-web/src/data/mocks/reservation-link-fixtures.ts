import type { GuestReservationDTO } from '@/modules/account/dtos/guest-reservation.dto';
import { reservationLinkDemo } from '@/modules/account/content/reservation-link-demo';

interface MockChallenge { accountId: string; email: string; reference: string; expiresAt: number; attempts: number; used: boolean }
export const reservationLinkChallenges = new Map<string, MockChallenge>();
export function resetReservationLinkFixtures() { reservationLinkChallenges.clear(); }

/** These fictional bookings exist independently of accounts and are not history until linked. */
export const unlinkedReservationFixtures: GuestReservationDTO[] = [
  { reservation_id: reservationLinkDemo.references[0], property_id: 'GT-HB-01', property_name: 'Hotel Boutique Antigua', booking_guest: 'Carlos Mendoza', period: 'CURRENT', status_code: 'CONFIRMED', status_label: 'Confirmada', policy: 'Condiciones de demostración; consulta tu confirmación.', stays: [
    { stay_id: 'ST-10420-01', room_type: 'Deluxe King', arrival: '2026-11-10', departure: '2026-11-13', status_code: 'RESERVED', status_label: 'Reservada', occupants: [{ guest_profile_id: 'profile-booker-10420', name: 'Carlos Mendoza' }] },
    { stay_id: 'ST-10420-02', room_type: 'Doble Superior', arrival: '2026-11-10', departure: '2026-11-13', status_code: 'RESERVED', status_label: 'Reservada', occupants: [{ guest_profile_id: 'profile-occupant-10420', name: 'María Pérez' }] },
  ] },
  { reservation_id: reservationLinkDemo.references[1], property_id: 'GT-HB-02', property_name: 'Hotel Boutique Ciudad', booking_guest: 'Carlos Mendoza', period: 'PAST', status_code: 'CONFIRMED', status_label: 'Confirmada', policy: 'Estadía de demostración finalizada.', stays: [
    { stay_id: 'ST-10421-01', room_type: 'Suite Terraza', arrival: '2026-08-10', departure: '2026-08-12', status_code: 'CHECKED_OUT', status_label: 'Salida completada', occupants: [{ guest_profile_id: 'profile-booker-10421', name: 'Carlos Mendoza' }] },
  ] },
];
