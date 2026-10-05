import { getPublicEnvironment } from '@/lib/env';
import { httpRequest } from '@/lib/http/client';
import type { ReservationLinkChallengeDTO, ReservationLinkResultDTO } from '../dtos/reservation-link.dto';

function mockPost<T>(path: string, input: object, signal: AbortSignal): Promise<T> {
  if (!getPublicEnvironment().useMockApi) return Promise.reject(new Error('RESERVATION_LINK_DEMO_DISABLED'));
  return httpRequest<T>({ path: `http://pms.test/__mock/reservation-links/${path}`, method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input), signal });
}
export function requestDemoReservationLink(accountId: string, reference: string, signal: AbortSignal) {
  return mockPost<ReservationLinkChallengeDTO>('challenges', { account_id: accountId, reference: reference.trim().toUpperCase() }, signal);
}
export function verifyDemoReservationLink(accountId: string, requestId: string, otp: string, signal: AbortSignal) {
  return mockPost<ReservationLinkResultDTO>('verify', { account_id: accountId, request_id: requestId, otp: otp.trim() }, signal);
}
