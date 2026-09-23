import { useMutation } from '@tanstack/react-query';

import { MockAccessService } from '@/modules/access/data/mocks/MockAccessService';
import { type AccessService } from '@/modules/access/data/services/AccessService';
import { type ReservationAccessRequest } from '@/modules/access/domain/models/ReservationAccess';

const defaultAccessService: AccessService = new MockAccessService();

/** TanStack Query mutation is the sole server-like state authority for Access. */
export function useLinkReservation(service: AccessService = defaultAccessService) {
  return useMutation({
    mutationFn: (request: ReservationAccessRequest) => service.linkReservation(request),
    retry: false,
  });
}
