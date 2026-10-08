"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useGuestSession } from "@/modules/auth";
import { useAccountSummary } from "@/modules/account";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { getGuestProfile, updateGuestProfile } from "../service/profile.service";
import { mapGuestProfile, toGuestProfileDTO } from "../mappers/profile.mapper";
import type { GuestProfile } from "../model/profile";

export function useGuestProfile() {
  const { account } = useGuestSession();
  const summary = useAccountSummary();
  const profileId = summary.data?.profileId;
  const client = useQueryClient();
  const currentAccount = useRef(account?.id);
  // Mutation completion must not re-populate Guest cache after logout.
  useEffect(() => { currentAccount.current = account?.id; return () => { currentAccount.current = undefined; }; }, [account?.id]);
  const queryKey = ["guest", "profile", account?.id, profileId];
  const query = useQuery({ queryKey, enabled: Boolean(account && profileId), queryFn: async ({ signal }) => {
    if (!account || !profileId) throw new Error("PROFILE_SCOPE_REQUIRED");
    const profile = mapGuestProfile(await getGuestProfile(profileId, account.id, signal));
    if (profile.id !== profileId) throw new DomainMappingError("PROFILE_SCOPE_MISMATCH");
    return profile;
  } });
  const mutation = useMutation({ mutationFn: async (draft: GuestProfile) => {
    if (!account || !profileId || draft.id !== profileId) throw new Error("PROFILE_SCOPE_REQUIRED");
    const profile = mapGuestProfile(await updateGuestProfile(toGuestProfileDTO(draft), account.id));
    if (profile.id !== profileId) throw new DomainMappingError("PROFILE_SCOPE_MISMATCH");
    return profile;
  }, onSuccess: profile => {
    if (currentAccount.current !== account?.id) return;
    client.setQueryData(queryKey, profile);
    void client.invalidateQueries({ queryKey: ["guest", "account-summary", account?.id] });
  } });
  return { ...query, error: summary.error || query.error || (summary.data && !profileId ? new Error("PROFILE_LINK_REQUIRED") : null),
    isPending: summary.isPending || query.isPending, retry: () => { if (profileId) void query.refetch(); else void summary.refetch(); }, mutation };
}
