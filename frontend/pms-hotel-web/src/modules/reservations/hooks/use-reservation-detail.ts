"use client";

import { useQuery } from "@tanstack/react-query";

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
      return mapReservationDetail(response);
    },
  });
}