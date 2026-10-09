'use client';
import { useQuery } from '@tanstack/react-query';
import { DomainMappingError } from '@/lib/errors';
import { listStaffReservations } from '../service/staff-reservation-read.service';
import { mapStaffReservationStays } from '../mappers/staff-reservation.mapper';

export function useStaffReservationStays(propertyId: string, sessionId: string, enabled = true) {
  return useQuery({ queryKey: ['reservations', 'staff-stays', sessionId, propertyId],
    enabled: enabled && !!propertyId && !!sessionId, retry: false, staleTime: 0,
    queryFn: async ({ signal }) => {
      const result = mapStaffReservationStays(await listStaffReservations(propertyId, signal));
      if (result.some(stay => stay.propertyId !== propertyId)) throw new DomainMappingError('RESERVATION_PROPERTY_MISMATCH');
      return result;
    } });
}
