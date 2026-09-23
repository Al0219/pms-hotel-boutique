"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { mapGuestAccount } from "../mappers/guest-account.mapper";
import type { GuestAccount } from "../model/guest-account";
import type { GuestAccessInput } from "../model/guest-access";
import { simulateGuestAccess } from "../service/guest-access.service";

export function useGuestSessionController() {
  const [account, setAccount] = useState<GuestAccount | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ input, signal }: { input: GuestAccessInput; signal: AbortSignal }) =>
      mapGuestAccount(await simulateGuestAccess(input, signal)),
    retry: false,
    gcTime: 0,
  });

  async function signIn(input: GuestAccessInput): Promise<boolean> {
    if (activeRequest.current || account) return false;
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

  function signOut() {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setAccount(null);
    mutation.reset();
    // Clear only Guest data; Staff and operational queries remain independent.
    void queryClient.cancelQueries({ queryKey: ["guest"] });
    queryClient.removeQueries({ queryKey: ["guest"] });
  }

  return {
    account,
    status: account ? "signed-in" as const : "signed-out" as const,
    isPending: mutation.isPending,
    error: mutation.error,
    resetError: mutation.reset,
    signIn,
    signOut,
  };
}
