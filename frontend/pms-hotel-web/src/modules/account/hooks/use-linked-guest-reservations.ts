'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGuestSession, refreshGuestSession } from '@/modules/auth';
import { HttpStatusError } from '@/lib/http/errors';
import { getLinkedGuestStays, getGuestStay } from '../service/linked-guest-reservations.service';
import { mapLinkedGuestReservations, mapGuestStay } from '../mappers/linked-guest-reservation.mapper';
async function guestRequest<T>(action: () => Promise<T>, onExpired?: () => void): Promise<T> {
  try { return await action(); }
  catch (error) {
    if (!(error instanceof HttpStatusError) || error.status !== 401) throw error;
    try { await refreshGuestSession(); return await action(); }
    catch (retryError) {
      if (retryError instanceof HttpStatusError && retryError.status === 401) onExpired?.();
      throw retryError;
    }
  }
}
export function useLinkedGuestReservations() {
  const { account, status, retrySession } = useGuestSession();
  const queryClient = useQueryClient();
  return useQuery({ queryKey: ['guest', 'reservations', 'real', account?.id], enabled: Boolean(account) && status === 'signed-in', retry: false,
    refetchOnMount: 'always', refetchOnWindowFocus: true,
    queryFn: async ({ signal }) => {
      const reservations = mapLinkedGuestReservations(await guestRequest(() => getLinkedGuestStays(signal), retrySession));
      void queryClient.invalidateQueries({ queryKey: ['guest', 'account-summary', account?.id] }).catch(() => undefined);
      return reservations;
    } });
}
export function useGuestStay(reservationId?: string, stayId?: string) {
  const { account, status, retrySession } = useGuestSession();
  return useQuery({ queryKey: ['guest', 'reservation-stay', 'real', account?.id, reservationId, stayId],
    enabled: Boolean(account && reservationId && stayId) && status === 'signed-in', retry: false,
    queryFn: async ({ signal }) => mapGuestStay(await guestRequest(() => getGuestStay(reservationId!, stayId!, signal), retrySession), reservationId!, stayId!) });
}
