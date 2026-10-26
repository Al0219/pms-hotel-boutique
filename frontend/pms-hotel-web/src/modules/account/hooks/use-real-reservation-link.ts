'use client';
import { useEffect, useRef, useState } from 'react';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { useGuestSession } from '@/modules/auth';
import { HttpNetworkError, HttpStatusError } from '@/lib/http';
import { mapRealLinkChallenge, mapRealLinkVerification } from '../mappers/real-guest-reservations.mapper';
import { requestRealReservationLink, verifyRealReservationLink } from '../service/real-guest-reservations.service';

type Flow = { identity: string; challenge?: { id: string; receivedAt: number }; linked?: boolean; error?: unknown; busy?: boolean };
export function useRealReservationLink() {
  const { account, sessionId, status, retrySession } = useGuestSession();
  const client = useQueryClient();
  const identity = JSON.stringify([account?.id, sessionId, status]);
  const current = useRef(identity), active = useRef<AbortController | null>(null);
  const [state, setState] = useState<Flow | null>(null);
  const flow = state?.identity === identity ? state : undefined;
  useEffect(() => { current.current = identity; return () => { current.current = ''; active.current?.abort(); active.current = null; }; }, [identity]);

  async function send(reference?: string, otp?: string) {
    if (!account || status !== 'signed-in' || active.current || current.current !== identity) return;
    if (otp !== undefined && !flow?.challenge) return;
    const request = new AbortController(); active.current = request;
    setState({ identity, challenge: flow?.challenge, busy: true });
    try {
      if (!onlineManager.isOnline()) throw new HttpNetworkError();
      if (otp === undefined) {
        const challenge = mapRealLinkChallenge(await requestRealReservationLink(reference!, request.signal));
        if (!request.signal.aborted && current.current === identity) setState({ identity, challenge: { ...challenge, receivedAt: Date.now() } });
      } else {
        mapRealLinkVerification(await verifyRealReservationLink(flow!.challenge!.id, otp, request.signal));
        if (request.signal.aborted || current.current !== identity) return;
        await Promise.all([
          client.invalidateQueries({ queryKey: ['guest', 'reservations', 'real', account.id] }),
          client.invalidateQueries({ queryKey: ['guest', 'reservation-stay', 'real', account.id] }),
          client.invalidateQueries({ queryKey: ['guest', 'account-summary', account.id] }),
        ]);
        if (!request.signal.aborted && current.current === identity) setState({ identity, linked: true });
      }
    } catch (error) {
      if (!request.signal.aborted && current.current === identity) {
        setState({ identity, challenge: flow?.challenge, error });
        if (error instanceof HttpStatusError && error.status === 401) retrySession();
      }
    } finally { if (active.current === request) active.current = null; }
  }
  return { challenge: flow?.challenge, linked: Boolean(flow?.linked), error: flow?.error, busy: Boolean(flow?.busy),
    request: (reference: string) => send(reference), verify: (otp: string) => send(undefined, otp),
    reset: () => { active.current?.abort(); active.current = null; setState(null); } };
}
