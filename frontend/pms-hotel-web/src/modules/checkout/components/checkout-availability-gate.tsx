'use client';

import type { ReactNode } from 'react';
import type { usePublicBookingReview } from '@/modules/booking';
import { EmptyState, ErrorState, LoadingState } from '@/shared/components';

export type BookingReview = ReturnType<typeof usePublicBookingReview>;
export function CheckoutAvailabilityGate({ review, children }: { review: BookingReview; children: ReactNode }) {
  const { hydrated, validCriteria, availability, ready, items, prices } = review;
  if (!hydrated) return <LoadingState message="Preparando tu estancia…" />;
  if (!validCriteria) return <EmptyState title="Completa tu búsqueda" description="Necesitamos fechas y huéspedes para continuar." />;
  if (availability.fetchStatus === 'paused') return <ErrorState title="Sin conexión" message="Recupera la conexión para revisar tu selección." onRetry={() => { void availability.refetch(); }} />;
  if (availability.isFetching || !ready && !availability.isError) return <LoadingState message="Verificando tu selección…" />;
  if (availability.isError) return <ErrorState title="No pudimos verificar tu selección" message="Reintenta antes de continuar." onRetry={() => { void availability.refetch(); }} />;
  if (!items.length || !prices.allValid) return <EmptyState title="Revisa tu selección antes de continuar" description="Falta elegir una habitación disponible para tus fechas." />;
  return children;
}
