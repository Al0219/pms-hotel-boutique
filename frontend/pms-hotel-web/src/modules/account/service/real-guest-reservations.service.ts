import { httpRequest } from '@/lib/http';
const url = (path: string) => new URL(path, window.location.origin).href;
export function requestRealReservationLink(confirmationCode: string, signal: AbortSignal) {
  return httpRequest<{ requestId: string }>({ path: url('/api/auth/guest/reservation-links/challenges'), method: 'POST', json: { confirmationCode: confirmationCode.trim() }, signal, withAuth: false });
}
export function verifyRealReservationLink(requestId: string, otp: string, signal: AbortSignal) {
  return httpRequest<null>({ path: url('/api/auth/guest/reservation-links/verify'), method: 'POST', json: { requestId, otp: otp.trim() }, signal, withAuth: false });
}
