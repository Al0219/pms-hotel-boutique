import { staffBffRead, staffBffRequest } from '@/lib/http/staff-bff';
import type { GuestCleaningRequestDto } from '../dtos/guest-cleaning-request.dto';
export function readGuestCleaningRequests(propertyId: string, signal?: AbortSignal): Promise<GuestCleaningRequestDto[]> {
  return staffBffRead(`/api/staff/housekeeping/requests?${new URLSearchParams({ propertyId })}`, signal);
}

export function transitionGuestCleaningRequest(propertyId: string, id: string, expectedUpdatedAt: string,
  targetStatus: 'IN_PROGRESS' | 'DONE', signal?: AbortSignal): Promise<import('../dtos/guest-cleaning-request.dto').HousekeepingTransitionDto> {
  return staffBffRequest(`/api/staff/housekeeping/requests/${encodeURIComponent(id)}/status?${new URLSearchParams({ propertyId })}`, {
    method: 'PUT', json: { expectedUpdatedAt, targetStatus }, signal,
  });
}
