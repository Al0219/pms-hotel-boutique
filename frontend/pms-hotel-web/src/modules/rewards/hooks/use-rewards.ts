"use client";
import { useQuery } from "@tanstack/react-query";
import { useGuestSession } from "@/modules/auth";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { getRewardsProgram } from "../service/rewards.service";
import { mapRewardsProgram } from "../mappers/rewards.mapper";
export function useRewards() {
  const { account } = useGuestSession();
  return useQuery({ queryKey: ["guest", "rewards", account?.id], enabled: Boolean(account), queryFn: async ({ signal }) => {
    if (!account) throw new Error("GUEST_SESSION_REQUIRED");
    const rewards = mapRewardsProgram(await getRewardsProgram(account.id, signal));
    if (rewards.accountId !== account.id) throw new DomainMappingError("ACCOUNT_SCOPE_MISMATCH");
    return rewards;
  } });
}
