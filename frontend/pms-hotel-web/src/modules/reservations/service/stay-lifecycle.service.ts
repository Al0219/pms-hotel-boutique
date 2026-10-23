import { staffBffRequest } from '@/lib/http/staff-bff';
import type { StayLifecycleResultDto } from '../dtos/stay-lifecycle.dto';
import type { StayLifecycleAction, StayLifecycleExpectation, StayLifecycleScope } from '../model/stay-lifecycle';

export function performStayLifecycle(scope: StayLifecycleScope, action: StayLifecycleAction,
  expectation: StayLifecycleExpectation, key: string, signal?: AbortSignal): Promise<StayLifecycleResultDto> {
  return staffBffRequest(`/api/staff/reservations/${encodeURIComponent(scope.reservationId)}/stays/${encodeURIComponent(scope.stayId)}/${action}?${new URLSearchParams({ propertyId: scope.propertyId })}`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': key },
    body: JSON.stringify(expectation), signal,
  });
}
