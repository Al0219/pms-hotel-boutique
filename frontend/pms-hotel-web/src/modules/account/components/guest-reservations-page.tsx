'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GuestAccountGate, useGuestSession } from '@/modules/auth';
import { getPublicEnvironment } from '@/lib/env';
import { LoadingState } from '@/shared/components';
import { AccountSection } from './account-section';
import { HistoryPage } from './history-page';

export function GuestReservationsPage() {
  const { account } = useGuestSession();
  const router = useRouter();
  useEffect(() => { if (!account) router.replace('/acceso?returnTo=%2Fmis-reservas'); }, [account, router]);
  if (!account) return <LoadingState message="Abriendo el acceso a tus reservas…" />;
  if (!getPublicEnvironment().useMockApi) return <AccountSection title="Mis reservas" description="El listado y la vinculación de esta entrega están disponibles en modo demostración. La conexión real está pendiente."><Link href="/habitaciones">Reservar como invitado</Link></AccountSection>;
  return <GuestAccountGate><HistoryPage title="Mis reservas" /></GuestAccountGate>;
}
