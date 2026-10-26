import { staffBffRead } from '@/lib/http/staff-bff';
import type { GuestCleaningRequestDto } from '../dtos/guest-cleaning-request.dto';
export function readGuestCleaningRequests(propertyId: string, signal?: AbortSignal): Promise<GuestCleaningRequestDto[]> {
  return staffBffRead(`/api/staff/housekeeping/requests?${new URLSearchParams({ propertyId })}`, signal);
}
