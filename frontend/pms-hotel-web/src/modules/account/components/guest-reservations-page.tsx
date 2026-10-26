'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GuestAccountGate, useGuestSession } from '@/modules/auth';
import { HistoryPage } from './history-page';

export function GuestReservationsPage() {
  const { account, status } = useGuestSession();
  const router = useRouter();
  useEffect(() => { if (status === 'signed-out' && !account) router.replace('/acceso?returnTo=%2Fmis-reservas'); }, [account, status, router]);
  return <GuestAccountGate returnTo="/mis-reservas"><HistoryPage title="Mis reservas" /></GuestAccountGate>;
}
