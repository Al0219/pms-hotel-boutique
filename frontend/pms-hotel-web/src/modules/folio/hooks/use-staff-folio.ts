'use client';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { DomainMappingError } from '@/lib/errors';
import { mapStaffFolioDetail, mapStaffFolioPage, mapStaffMovementPage } from '../mappers/staff-folio.mapper';
import { readStaffFolio, readStaffFolios, readStaffMovements } from '../service/staff-folio.service';

export function useStaffFolios(sessionId: string, propertyId: string, reservationId: string) {
  return useInfiniteQuery({ queryKey: ['staff-folio', sessionId, propertyId, reservationId, 'list'], initialPageParam: undefined as string | undefined,
    queryFn: async ({ signal, pageParam }) => mapStaffFolioPage(await readStaffFolios(propertyId, reservationId, pageParam, signal), propertyId, reservationId),
    getNextPageParam: page => page.nextCursor ?? undefined, retry: false });
}
export function useStaffFolio(sessionId: string, propertyId: string, reservationId: string, folioId: string) {
  const detail = useQuery({ queryKey: ['staff-folio', sessionId, propertyId, reservationId, folioId, 'detail'], retry: false,
    queryFn: async ({ signal }) => {
      const result = mapStaffFolioDetail(await readStaffFolio(propertyId, folioId, signal), propertyId, folioId);
      if (result.folio.reservationId !== reservationId) throw new Error('FOLIO_RESERVATION_MISMATCH');
      return result;
    } });
  const movements = useInfiniteQuery({ queryKey: ['staff-folio', sessionId, propertyId, reservationId, folioId, 'movements'], retry: false,
    initialPageParam: undefined as string | undefined,
    enabled: detail.isSuccess,
    queryFn: async ({ signal, pageParam }) => {
      const page = mapStaffMovementPage(await readStaffMovements(propertyId, folioId, pageParam, signal), propertyId, folioId);
      if (page.items.some(row => row.amount.currency !== detail.data?.folio.currency)) throw new DomainMappingError('FOLIO_CURRENCY_MISMATCH');
      return page;
    },
    getNextPageParam: page => page.nextCursor ?? undefined });
  return { detail, movements };
}
