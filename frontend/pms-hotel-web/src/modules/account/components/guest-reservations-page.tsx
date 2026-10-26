'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GuestAccountGate, useGuestSession } from '@/modules/auth';
import { getPublicEnvironment } from '@/lib/env';
import { LoadingState } from '@/shared/components';
import { RealGuestReservations } from './real-guest-reservations';
import { HistoryPage } from './history-page';

export function GuestReservationsPage() {
  const { account, status } = useGuestSession();
  const router = useRouter();
  useEffect(() => { if (!account && status === 'signed-out') router.replace('/acceso?returnTo=%2Fmis-reservas'); }, [account, router, status]);
  if (!account && status !== "error") return <LoadingState message="Abriendo el acceso a tus reservas…" />;
  return <GuestAccountGate returnTo="/mis-reservas">{getPublicEnvironment().useMockApi ? <HistoryPage title="Mis reservas" /> : <RealGuestReservations />}</GuestAccountGate>;
}
