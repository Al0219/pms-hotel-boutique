"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mapCancellationApply, mapCancellationPreview } from "../mappers/reservation-cancellation.mapper";
import { applyCancellation, previewCancellation } from "../service/reservation.service";

/** Preview habilitado solo mientras el modal de cancelación está abierto. */
export function useCancellationPreview(
  propertyId: string | undefined,
  endpoint: string | undefined,
  reservationId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["reservations", "cancellation-preview", propertyId, endpoint, reservationId],
    enabled: Boolean(propertyId && endpoint && reservationId && enabled),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint || !reservationId) {
        throw new Error("CANCELLATION_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await previewCancellation({ endpoint, propertyId, reservationId, signal });
      return mapCancellationPreview(response);
    },
  });
}

export function useApplyCancellation(
  propertyId: string | undefined,
  endpoint: string | undefined,
  reservationId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reason: string) => {
      if (!propertyId || !endpoint || !reservationId) {
        throw new Error("CANCELLATION_MUTATION_CONFIGURATION_REQUIRED");
      }

      const response = await applyCancellation({ endpoint, propertyId, reservationId, reason });
      return mapCancellationApply(response);
    },
    onSuccess: () => {
      // Refresca centro de reservas (prefijo), detalle y preview para no dejar estados obsoletos.
      void queryClient.invalidateQueries({ queryKey: ["reservations", propertyId, endpoint] });
      void queryClient.invalidateQueries({ queryKey: ["reservations", "cancellation-preview", propertyId, endpoint, reservationId] });
    },
  });
}