import { useQuery } from "@tanstack/react-query";

import { type ActiveReservationContext } from "@/modules/guest-auth/domain/models/ActiveReservationContext";
import { useActiveReservationContext } from "@/modules/guest-auth/presentation/ActiveReservationContextProvider";
import { reservationContextKey } from "@/modules/guest-auth/presentation/queryKeys";
import { mapReservationStayDto } from "@/modules/stay/data/mappers/mapReservationStayDto";
import { MockStayService } from "@/modules/stay/data/mocks/MockStayService";
import { type StayService } from "@/modules/stay/data/services/StayService";
import { type ReservationStay } from "@/modules/stay/domain/models/ReservationStay";

const defaultStayService: StayService = new MockStayService();

async function loadCurrentStay(
  service: StayService,
  context: ActiveReservationContext,
): Promise<ReservationStay> {
  return mapReservationStayDto(await service.getCurrentStay(context));
}

/** TanStack Query owns context-scoped stay server state; no active context means no request. */
export function useCurrentStay(
  service: StayService = defaultStayService,
  explicitContext?: ActiveReservationContext | null,
) {
  const { activeReservationContext } = useActiveReservationContext();
  const context =
    explicitContext === undefined ? activeReservationContext : explicitContext;
  return useQuery({
    queryKey: context ? reservationContextKey(context) : ["stay", "none"],
    queryFn: () => loadCurrentStay(service, context!),
    enabled: Boolean(context),
  });
}
