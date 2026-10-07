"use client";

import { useQuery } from "@tanstack/react-query";
import { DomainMappingError } from '@/lib/errors';

import { mapReservationDetail } from "../mappers/reservation-detail.mapper";
import { getReservationDetail } from "../service/reservation.service";

export function useReservationDetail(
  propertyId: string | undefined,
  endpoint: string | undefined,
  reservationId: string | undefined,
) {
  return useQuery({
    queryKey: ["reservations", propertyId, endpoint, reservationId],
    enabled: Boolean(propertyId && endpoint && reservationId),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint || !reservationId) {
        throw new Error("RESERVATION_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await getReservationDetail({ endpoint, propertyId, reservationId, signal });
      const result = mapReservationDetail(response);
      if (result.propertyId !== propertyId || result.id !== reservationId) throw new DomainMappingError('RESERVATION_SCOPE_MISMATCH');
      return result;
    },
  });
}
