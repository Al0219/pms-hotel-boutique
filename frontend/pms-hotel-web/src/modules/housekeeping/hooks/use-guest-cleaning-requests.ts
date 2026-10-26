import { useQuery } from '@tanstack/react-query';
import { readGuestCleaningRequests } from '../service/guest-cleaning-requests.service';
import { mapGuestCleaningRequests } from '../mappers/guest-cleaning-request.mapper';
export function useGuestCleaningRequests(propertyId: string, sessionId: string) {
  return useQuery({ queryKey: ['staff-guest-cleaning-requests', sessionId, propertyId], enabled: !!propertyId && !!sessionId,
    retry: false, staleTime: 0, refetchOnWindowFocus: true,
    queryFn: async ({ signal }) => mapGuestCleaningRequests(await readGuestCleaningRequests(propertyId, signal), propertyId),
  });
}
