"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { getPublicEnvironment } from "@/lib/env";
import { mapGuestAccount } from "../mappers/guest-account.mapper";
import { mapGuestSession } from "../mappers/guest-session.mapper";
import type { GuestAccount } from "../model/guest-account";
import type { GuestSessionAccount } from "../model/guest-session";
import type { GuestAccessInput } from "../model/guest-access";
import { simulateGuestAccess } from "../service/guest-access.service";
import { getGuestSessionDTO, logoutGuestSession } from "../service/guest-session.service";

const sessionKey = ["guest-session"] as const;

export function useGuestSessionController() {
  const mockMode = getPublicEnvironment().useMockApi;
  const [mockAccount, setAccount] = useState<GuestAccount | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const closing = useRef(false);
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: sessionKey,
    enabled: !mockMode,
    queryFn: async ({ signal }) => {
      const dto = await getGuestSessionDTO(signal);
      return dto === null ? null : mapGuestSession(dto);
    },
    retry: false,
    gcTime: 0,
    networkMode: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const logout = useMutation({ mutationFn: logoutGuestSession, retry: false, gcTime: 0, networkMode: "always" });
  const account: GuestAccount | GuestSessionAccount | null = mockMode
    ? mockAccount : session.isError ? null : session.data?.account ?? null;
  const mutation = useMutation({
    mutationFn: async ({ input, signal }: { input: GuestAccessInput; signal: AbortSignal }) =>
      mapGuestAccount(await simulateGuestAccess(input, signal)),
    retry: false,
    gcTime: 0,
  });

  async function signIn(input: GuestAccessInput): Promise<boolean> {
    if (!mockMode || activeRequest.current || account) return false;
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const result = await mutation.mutateAsync({ input, signal: controller.signal });
      if (controller.signal.aborted) return false;
      setAccount(result);
      return true;
    } catch {
      return false;
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  async function signOut(): Promise<boolean> {
    if (closing.current) return false;
    if (!mockMode) {
      closing.current = true;
      try {
        await logout.mutateAsync();
        // Cancel outstanding reads before clearing, so they cannot restore a revoked session.
        await queryClient.cancelQueries({ queryKey: sessionKey });
        await queryClient.cancelQueries({ queryKey: ["guest"] });
        queryClient.removeQueries({ queryKey: ["guest"] });
        queryClient.setQueryData(sessionKey, null);
        return true;
      } catch {
        return false;
      } finally {
        closing.current = false;
      }
    }
    activeRequest.current?.abort();
    activeRequest.current = null;
    setAccount(null);
    mutation.reset();
    // Clear only Guest data; Staff and operational queries remain independent.
    void queryClient.cancelQueries({ queryKey: ["guest"] });
    queryClient.removeQueries({ queryKey: ["guest"] });
    return true;
  }

  return {
    account,
    status: !mockMode && (session.isPending || session.isFetching) ? "checking" as const
      : !mockMode && session.isError ? "error" as const
      : account ? "signed-in" as const : "signed-out" as const,
    isPending: mockMode ? mutation.isPending : logout.isPending,
    error: mockMode ? mutation.error : session.error ?? logout.error,
    resetError: mockMode ? mutation.reset : logout.reset,
    retrySession: () => { if (!mockMode && !closing.current) void session.refetch(); },
    signIn,
    signOut,
  };
}
