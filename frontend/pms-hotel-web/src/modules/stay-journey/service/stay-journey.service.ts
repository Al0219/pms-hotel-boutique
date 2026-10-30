import { staffBffRead, staffBffRequest } from '@/lib/http/staff-bff';
import type { JourneyResponseDto, SimulatedPaymentInputDto } from '../dtos/stay-journey.dto';
import type { SimulatedPaymentInput } from '../model/stay-journey';
export interface JourneyContext { propertyId: string; reservationId: string; stayId: string }
function path(c: JourneyContext, action: string) { return `/api/staff/stay-journey/${c.reservationId}/${c.stayId}/${action}?propertyId=${encodeURIComponent(c.propertyId)}`; }
export const readJourney = (c: JourneyContext, action: 'summary' | 'requests' | 'document', signal?: AbortSignal) => staffBffRead<JourneyResponseDto>(path(c, action), signal);
export function simulateJourneyPayment(c: JourneyContext, input: SimulatedPaymentInput, key: string, signal?: AbortSignal) {
  const dto: SimulatedPaymentInputDto = { amount: input.amount, currency: input.currency, instrumentToken: input.instrumentToken };
  return staffBffRequest<JourneyResponseDto>(path(c, 'payments'), { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify(dto), signal });
}
export const reconcileJourney = (c: JourneyContext, signal?: AbortSignal) => staffBffRequest<JourneyResponseDto>(path(c, 'reconcile'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}', signal });

export const documentFile=(c:JourneyContext,issue=false)=>issue?staffBffRequest<JourneyResponseDto>(path(c,'document-file'),{method:'POST',headers:{'content-type':'application/json'},body:'{}'}):staffBffRead<JourneyResponseDto>(path(c,'document-file'));
