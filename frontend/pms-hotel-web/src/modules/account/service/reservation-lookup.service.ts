import { httpRequest } from '@/lib/http/client';
import type { ReservationLookupDTO } from '../dtos/reservation-lookup.dto';

export const searchReservation = (email: string, confirmationCode: string, signal?: AbortSignal) =>
  httpRequest<ReservationLookupDTO>({
    path: new URL('/api/public/reservation-lookup/search', window.location.origin).href,
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, confirmationCode }), withAuth: false, signal,
  });
