"use client";

import { useQuery } from "@tanstack/react-query";
import { useGuestSession } from "@/modules/auth";
import { getPublicEnvironment } from "@/lib/env";
import { HttpStatusError } from "@/lib/http/errors";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { getAccountSummary, getMockAccountSummary } from "../service/account.service";
import { mapAccountSummary, mapMockAccountSummary } from "../mappers/account.mapper";

export function useAccountSummary() {
  const { account, status, retrySession } = useGuestSession();
  const mockMode = getPublicEnvironment().useMockApi;
  return useQuery({
    queryKey: ["guest", "account-summary", account?.id],
    enabled: Boolean(account) && status === "signed-in",
    retry: false,
    queryFn: async ({ signal }) => {
      if (!account) throw new Error("GUEST_SESSION_REQUIRED");
      const summary = await (async () => {
        try {
          return mockMode ? mapMockAccountSummary(await getMockAccountSummary(account.id, signal))
            : mapAccountSummary(await getAccountSummary(signal));
        } catch (error) {
          if (!mockMode && error instanceof HttpStatusError && error.status === 401) retrySession();
          throw error;
        }
      })();
      if (summary.accountId !== account.id) throw new DomainMappingError("ACCOUNT_SCOPE_MISMATCH");
      return summary;
    },
  });
}
