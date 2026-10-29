import { httpRequest } from '@/lib/http/client';
import type { LinkedGuestStayDTO, GuestStayDTO } from '../dtos/linked-guest-stay.dto';
const url = (suffix = '') => new URL('/api/auth/guest/account/reservations' + suffix, window.location.origin).href;
export async function getLinkedGuestStays(signal?: AbortSignal): Promise<LinkedGuestStayDTO[]> {
  // Repair only the authenticated account's eligible links; never recreate/recharge a booking.
  await httpRequest<null>({ path: url('/reconcile'), method: 'POST', signal, withAuth: false });
  return httpRequest({ path: url(), signal, withAuth: false });
}
export function getGuestStay(reservationId: string, stayId: string, signal?: AbortSignal): Promise<GuestStayDTO> {
  return httpRequest({ path: url(`/${encodeURIComponent(reservationId)}/stays/${encodeURIComponent(stayId)}`), signal, withAuth: false });
}

export function getGuestReservationSummary(reservationId:string,signal?:AbortSignal) {
  return httpRequest<import("../dtos/reservation-lookup.dto").ReservationLookupDTO>({path:url("/"+encodeURIComponent(reservationId)+"/summary"),signal,withAuth:false});
}
