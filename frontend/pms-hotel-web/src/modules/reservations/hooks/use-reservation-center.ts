"use client";

import { useQuery } from "@tanstack/react-query";
import { DomainMappingError } from '@/lib/errors';

import { mapReservationCenter } from "../mappers/reservation-list.mapper";
import { listReservationCenter } from "../service/reservation.service";

export function useReservationCenter(propertyId: string | undefined, endpoint: string | undefined) {
  return useQuery({
    queryKey: ["reservations", propertyId, endpoint],
    enabled: Boolean(propertyId && endpoint),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint) {
        throw new Error("RESERVATION_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await listReservationCenter({ endpoint, propertyId, signal });
      const result = mapReservationCenter(response);
      if (result.reservations.some(item => item.propertyId !== propertyId)) throw new DomainMappingError('RESERVATION_PROPERTY_MISMATCH');
      return result;
    },
  });
}
