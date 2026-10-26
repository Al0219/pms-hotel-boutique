import { useQuery } from "@tanstack/react-query";

import { linkedReservationsService, guestAccountService } from "@/modules/guest-auth/data/services/guestServices";
import { type LinkedReservationsService } from "@/modules/guest-auth/data/services/LinkedReservationsService";

const defaultLinkedReservationsService: LinkedReservationsService =
  linkedReservationsService;

/** Account-scoped linked reservations. No credentials or active context are part of this key. */
export function useLinkedReservations(
  accountId: string | null | undefined,
  service: LinkedReservationsService = defaultLinkedReservationsService,
) {
  return useQuery({
    queryKey: ["guest", "linked-reservations", accountId],
    queryFn: async () => {
      if (service === linkedReservationsService) await guestAccountService.getCurrent({ accountId: accountId! });
      return service.listForAccount(accountId!);
    },
    enabled: Boolean(accountId),
    refetchOnMount: "always",
  });
}
