import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useRef } from "react";
import { Alert } from "react-native";
import { guestAuthService } from "@/modules/guest-auth/data/services/guestServices";
import { type GuestAuthService } from "@/modules/guest-auth/data/services/GuestAuthService";

import { useActiveReservationContext } from "@/modules/guest-auth/presentation/ActiveReservationContextProvider";
import { useGuestAuthSession } from "@/modules/guest-auth/presentation/GuestAuthSessionProvider";

/** Clears the in-memory Guest identity and returns to the public login boundary. */
export function useGuestLogout(service: GuestAuthService = guestAuthService) {
  const pending = useRef(false);
  const queryClient = useQueryClient();
  const { clearActiveReservationContext } = useActiveReservationContext();
  const { clearSession } = useGuestAuthSession();
  const clearLocal = useCallback(() => {
    clearActiveReservationContext();
    clearSession();
    queryClient.clear();
    router.replace("/login");
  }, [clearActiveReservationContext, clearSession, queryClient]);
  return useCallback(() => {
    if (!service.logout) { clearLocal(); return; }
    if (pending.current) return;
    pending.current = true;
    void service.logout().then(clearLocal).catch(() => {
      Alert.alert('No pudimos cerrar sesión', 'Revisa tu conexión e inténtalo nuevamente.');
    }).finally(() => { pending.current = false; });
  }, [clearLocal, service]);
}
