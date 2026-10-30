import { staffBffRead, staffBffRequest } from '@/lib/http/staff-bff';
import type { StaffCancellationPreviewDto, StaffCancellationResultDto } from '../dtos/staff-cancellation.dto';
import type { CancellationRequest, CancellationScope } from '../model/staff-cancellation';

function path(scope: CancellationScope, action: string) {
  return `/api/staff/reservations/${encodeURIComponent(scope.reservationId)}/${action}?${new URLSearchParams({ propertyId: scope.propertyId })}`;
}
export function readCancellationPreview(scope: CancellationScope, signal?: AbortSignal) {
  return staffBffRead<StaffCancellationPreviewDto>(path(scope, 'cancellation-preview'), signal);
}
export function cancelStaffReservation(scope: CancellationScope, body: CancellationRequest, key: string, signal?: AbortSignal) {
  return staffBffRequest<StaffCancellationResultDto>(path(scope, 'cancellation'), {
    method: 'POST', headers: { 'idempotency-key': key },
    json: { expectedFingerprint: body.expectedFingerprint, reason: body.reason }, signal,
  });
}
