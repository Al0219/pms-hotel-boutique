import { NativeGuestClient, nativeGuestClient } from '@/modules/guest-auth/data/http/NativeGuestClient';
import { type ActiveReservationContext } from '@/modules/guest-auth/domain/models/ActiveReservationContext';
import { type HousekeepingRequest } from '../../domain/HousekeepingRequest';
import { type HousekeepingRequestDto } from '../dtos/HousekeepingRequestDto';
import { type HousekeepingService } from '../services/HousekeepingService';

function path(context: ActiveReservationContext) {
  return `/api/v1/guest-auth/account/reservations/${encodeURIComponent(context.reservationId)}/stays/${encodeURIComponent(context.reservationStayId)}/housekeeping-requests`;
}
export class HttpHousekeepingService implements HousekeepingService {
  constructor(private readonly client: NativeGuestClient = nativeGuestClient) {}
  submitRequest(input: HousekeepingRequest, context?: ActiveReservationContext, requestKey?: string): Promise<HousekeepingRequestDto> {
    if (!context || !requestKey) return Promise.reject(new Error('Housekeeping context and intent required'));
    const notes = input.notes?.trim();
    return this.client.request<HousekeepingRequestDto>(path(context), { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestKey },
      body: JSON.stringify({ serviceDate: input.serviceDate, timeSlot: input.timeSlot,
        cleaningType: input.cleaningType, ...(notes ? { notes } : {}) }),
    });
  }
  listRequests(context: ActiveReservationContext) { return this.client.request<HousekeepingRequestDto[]>(path(context)); }
}
