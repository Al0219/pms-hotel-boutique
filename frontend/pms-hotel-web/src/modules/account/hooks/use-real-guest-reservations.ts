'use client';
import { useQuery } from '@tanstack/react-query';
import { useGuestSession } from '@/modules/auth';
import { HttpStatusError } from '@/lib/http';
import { mapRealGuestReservationPage, mapRealGuestReservationDetail } from '../mappers/real-guest-reservations.mapper';
import { readRealGuestReservations, readRealGuestReservation } from '../service/real-guest-reservations.service';
export function useRealGuestReservations(page: number, size = 20) {
  const { account, status, retrySession } = useGuestSession();
  return useQuery({ queryKey: ['guest', 'reservations', account?.id, page, size], enabled: Boolean(account) && status === 'signed-in', retry: false,
    queryFn: async ({ signal }) => {
      if (!account) throw new Error('GUEST_SESSION_REQUIRED');
      try { return mapRealGuestReservationPage(await readRealGuestReservations(page, size, signal), account.id, page, size); }
      catch (e) { if (e instanceof HttpStatusError && e.status === 401) retrySession(); throw e; }
    } });
}
export function useRealGuestReservation(id: string) {
  const { account, status, retrySession } = useGuestSession();
  return useQuery({ queryKey: ['guest', 'reservation-detail', account?.id, id], enabled: Boolean(account) && status === 'signed-in', retry: false,
    queryFn: async ({ signal }) => {
      if (!account) throw new Error('GUEST_SESSION_REQUIRED');
      try { return mapRealGuestReservationDetail(await readRealGuestReservation(id, signal), account.id, id); }
      catch (e) { if (e instanceof HttpStatusError && e.status === 401) retrySession(); throw e; }
    } });
}
