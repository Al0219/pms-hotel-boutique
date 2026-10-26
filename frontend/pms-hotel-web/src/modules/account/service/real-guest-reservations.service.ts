import { httpRequest } from '@/lib/http';
import type { RealGuestReservationPageDTO, RealGuestReservationDetailDTO, RealReservationLinkChallengeDTO } from '../dtos/real-guest-reservations.dto';
const endpoint = '/api/auth/guest/account/reservations';
const url = (path: string) => new URL(path, window.location.origin).href;
export function readRealGuestReservations(page: number, size: number, signal: AbortSignal) {
  return httpRequest<RealGuestReservationPageDTO>({ path: url(endpoint + '?' + new URLSearchParams({ page: String(page), size: String(size) })), signal, withAuth: false });
}
export function readRealGuestReservation(id: string, signal: AbortSignal) {
  return httpRequest<RealGuestReservationDetailDTO>({ path: url(endpoint + '/' + encodeURIComponent(id)), signal, withAuth: false });
}
export function requestRealReservationLink(confirmationCode: string, signal: AbortSignal) {
  return httpRequest<RealReservationLinkChallengeDTO>({ path: url('/api/auth/guest/reservation-links/challenges'), method: 'POST', json: { confirmationCode: confirmationCode.trim() }, signal, withAuth: false });
}
export function verifyRealReservationLink(requestId: string, otp: string, signal: AbortSignal) {
  return httpRequest<null>({ path: url('/api/auth/guest/reservation-links/verify'), method: 'POST', json: { requestId, otp: otp.trim() }, signal, withAuth: false });
}
