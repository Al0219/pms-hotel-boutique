'use client';

import { useEffect, useRef, useState } from 'react';
import { onlineManager, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGuestSession } from '@/modules/auth';
import { HttpNetworkError } from '@/lib/http/errors';
import { mapLinkChallenge, mapLinkResult } from '../mappers/reservation-link.mapper';
import { requestDemoReservationLink, verifyDemoReservationLink } from '../service/reservation-link.service';
import type { ReservationLinkChallenge, ReservationLinkResult } from '../model/reservation-link';

export function useReservationLink() {
  const { account } = useGuestSession();
  const client = useQueryClient();
  const [challenge, setChallenge] = useState<ReservationLinkChallenge | null>(null);
  const [linked, setLinked] = useState<ReservationLinkResult | null>(null);
  const [working, setWorking] = useState(false);
  const currentAccount = useRef(account);
  const active = useRef<AbortController | null>(null);
  useEffect(() => { currentAccount.current = account; return () => { currentAccount.current = null; active.current?.abort(); }; }, [account]);
  const issue = useMutation({ mutationFn: async ({ reference, signal, accountId }: { reference: string; signal: AbortSignal; accountId: string }) => {
    if (!onlineManager.isOnline()) throw new HttpNetworkError();
    return mapLinkChallenge(await requestDemoReservationLink(accountId, reference, signal), accountId);
  }, networkMode: 'always', retry: false, gcTime: 0 });
  const verify = useMutation({ mutationFn: async ({ requestId, otp, signal, accountId }: { requestId: string; otp: string; signal: AbortSignal; accountId: string }) => {
    if (!onlineManager.isOnline()) throw new HttpNetworkError();
    return mapLinkResult(await verifyDemoReservationLink(accountId, requestId, otp, signal), accountId, requestId);
  }, networkMode: 'always', retry: false, gcTime: 0 });
  async function request(reference: string) {
    if (!account || active.current) return;
    const controller = new AbortController(); active.current = controller; setWorking(true);
    try {
      const result = await issue.mutateAsync({ reference, signal: controller.signal, accountId: account.id });
      if (!controller.signal.aborted && currentAccount.current === account) { setChallenge(result); setLinked(null); verify.reset(); }
    } catch { /* Mutation owns the recoverable error state. */ }
    finally { if (active.current === controller) { active.current = null; if (currentAccount.current === account) setWorking(false); } }
  }
  async function confirm(otp: string) {
    if (!account || !challenge || active.current) return;
    const controller = new AbortController(); active.current = controller; setWorking(true);
    try {
      const result = await verify.mutateAsync({ requestId: challenge.id, otp, signal: controller.signal, accountId: account.id });
      if (controller.signal.aborted || currentAccount.current !== account) return;
      await Promise.all([
        client.invalidateQueries({ queryKey: ['guest', 'reservations', account.id] }),
        client.invalidateQueries({ queryKey: ['guest', 'account-summary', account.id] }),
      ]);
      if (!controller.signal.aborted && currentAccount.current === account) { setLinked(result); setChallenge(null); }
    } catch { /* No optimistic link or success on failure. */ }
    finally { if (active.current === controller) { active.current = null; if (currentAccount.current === account) setWorking(false); } }
  }
  function reset() { active.current?.abort(); active.current = null; setWorking(false); setChallenge(null); setLinked(null); issue.reset(); verify.reset(); }
  return { challenge, linked, request, confirm, reset, error: issue.error ?? verify.error, clearError: () => { issue.reset(); verify.reset(); }, isPending: working || issue.isPending || verify.isPending };
}
