"use client";
import { useQuery } from "@tanstack/react-query";
import { useGuestSession } from "@/modules/auth";
import { list } from "@/lib/validation";
import { getPromotions } from "../service/promotions.service";
import { mapPromotion } from "../mappers/promotions.mapper";
export function usePromotions() {
  const { account } = useGuestSession();
  return useQuery({ queryKey: ["guest", "promotions", account?.id], enabled: Boolean(account), queryFn: async ({ signal }) => {
    if (!account) throw new Error("GUEST_SESSION_REQUIRED");
    return list(await getPromotions(account.id, signal)).map(mapPromotion);
  } });
}
