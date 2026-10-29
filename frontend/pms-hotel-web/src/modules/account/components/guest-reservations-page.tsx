'use client';

import { GuestAccountGate, useGuestSession } from '@/modules/auth';
import { getPublicEnvironment } from '@/lib/env';
import { LoadingState } from '@/shared/components';
import { RealGuestReservations } from './real-guest-reservations';
import { HistoryPage } from './history-page';
import { PublicReservationLookup } from './public-reservation-lookup';

export function GuestReservationsPage() {
  const { account, status } = useGuestSession();
  if (!account && status === 'checking') return <LoadingState message="Abriendo tus reservas…" />;
  if (!account) return <PublicReservationLookup />;
  return <GuestAccountGate returnTo="/mis-reservas">{getPublicEnvironment().useMockApi ? <HistoryPage title="Mis reservas" /> : <RealGuestReservations />}</GuestAccountGate>;
}
