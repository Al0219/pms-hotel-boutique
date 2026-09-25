"use client";

import { useQuery } from "@tanstack/react-query";
import { useGuestSession } from "@/modules/auth";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { getAccountSummary } from "../service/account.service";
import { mapAccountSummary } from "../mappers/account.mapper";

export function useAccountSummary() {
  const { account } = useGuestSession();
  return useQuery({
    queryKey: ["guest", "account-summary", account?.id],
    enabled: Boolean(account),
    queryFn: async ({ signal }) => {
      if (!account) throw new Error("GUEST_SESSION_REQUIRED");
      const summary = mapAccountSummary(await getAccountSummary(account.id, signal));
      if (summary.accountId !== account.id) throw new DomainMappingError("ACCOUNT_SCOPE_MISMATCH");
      return summary;
    },
  });
}
