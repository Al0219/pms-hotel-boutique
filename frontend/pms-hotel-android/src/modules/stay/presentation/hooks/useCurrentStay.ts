import { useQuery } from '@tanstack/react-query';

import { mapReservationStayDto } from '@/modules/stay/data/mappers/mapReservationStayDto';
import { MockStayService } from '@/modules/stay/data/mocks/MockStayService';
import { type StayService } from '@/modules/stay/data/services/StayService';
import { type ReservationStay } from '@/modules/stay/domain/models/ReservationStay';

export const currentStayQueryKey = ['stay', 'current'] as const;

const defaultStayService: StayService = new MockStayService();

async function loadCurrentStay(service: StayService): Promise<ReservationStay> {
  return mapReservationStayDto(await service.getCurrentStay());
}

/** TanStack Query owns the current-stay server state; this hook owns no store. */
export function useCurrentStay(service: StayService = defaultStayService) {
  return useQuery({
    queryKey: currentStayQueryKey,
    queryFn: () => loadCurrentStay(service),
  });
}
