import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback } from "react";

import { useActiveReservationContext } from "@/modules/guest-auth/presentation/ActiveReservationContextProvider";
import { useGuestAuthSession } from "@/modules/guest-auth/presentation/GuestAuthSessionProvider";

/** Clears the in-memory Guest identity and returns to the public login boundary. */
export function useGuestLogout() {
  const queryClient = useQueryClient();
  const { clearActiveReservationContext } = useActiveReservationContext();
  const { clearSession } = useGuestAuthSession();
  return useCallback(() => {
    clearActiveReservationContext();
    clearSession();
    queryClient.clear();
    router.replace("/login");
  }, [clearActiveReservationContext, clearSession, queryClient]);
}
