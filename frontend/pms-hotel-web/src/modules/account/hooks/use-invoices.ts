"use client";
import { useQuery } from "@tanstack/react-query";
import { useGuestSession } from "@/modules/auth";
import { getInvoices } from "../service/invoice.service";
import { mapInvoices } from "../mappers/invoice.mapper";
export function useInvoices() {
  const { account } = useGuestSession();
  return useQuery({ queryKey: ["guest", "invoices", account?.id], enabled: Boolean(account), queryFn: async ({ signal }) => {
    if (!account) throw new Error("GUEST_SESSION_REQUIRED");
    return mapInvoices(await getInvoices(account.id, signal), account.id);
  } });
}
