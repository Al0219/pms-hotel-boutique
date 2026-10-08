import { useQuery } from "@tanstack/react-query";

import { MockLinkedReservationsService } from "@/modules/guest-auth/data/mocks/MockLinkedReservationsService";
import { type LinkedReservationsService } from "@/modules/guest-auth/data/services/LinkedReservationsService";

const defaultLinkedReservationsService: LinkedReservationsService =
  new MockLinkedReservationsService();

/** Account-scoped linked reservations. No credentials or active context are part of this key. */
export function useLinkedReservations(
  accountId: string | null | undefined,
  service: LinkedReservationsService = defaultLinkedReservationsService,
) {
  return useQuery({
    queryKey: ["guest", "linked-reservations", accountId],
    queryFn: () => service.listForAccount(accountId!),
    enabled: Boolean(accountId),
  });
}
