"use client";
import { useQuery } from "@tanstack/react-query";
import { useGuestSession } from "@/modules/auth";
import { getStayHistory } from "../service/account.service";
import { mapGuestReservations } from "../mappers/guest-reservation.mapper";

export function useGuestReservations() {
  const { account } = useGuestSession();
  return useQuery({ queryKey: ["guest", "reservations", account?.id], enabled: Boolean(account), queryFn: async ({ signal }) => {
    if (!account) throw new Error("GUEST_SESSION_REQUIRED");
    return mapGuestReservations(await getStayHistory(account.id, signal), account.id);
  } });
}
