"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mapNoShowApply, mapNoShowPreview } from "../mappers/reservation-no-show.mapper";
import { applyNoShow, previewNoShow } from "../service/reservation.service";

/** Preview habilitado solo mientras el panel de no-show está abierto. */
export function useNoShowPreview(
  propertyId: string | undefined,
  endpoint: string | undefined,
  reservationId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["reservations", "no-show-preview", propertyId, endpoint, reservationId],
    enabled: Boolean(propertyId && endpoint && reservationId && enabled),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint || !reservationId) {
        throw new Error("NO_SHOW_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await previewNoShow({ endpoint, propertyId, reservationId, signal });
      return mapNoShowPreview(response);
    },
  });
}

export function useApplyNoShow(
  propertyId: string | undefined,
  endpoint: string | undefined,
  reservationId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!propertyId || !endpoint || !reservationId) {
        throw new Error("NO_SHOW_MUTATION_CONFIGURATION_REQUIRED");
      }

      const response = await applyNoShow({ endpoint, propertyId, reservationId });
      return mapNoShowApply(response);
    },
    onSuccess: () => {
      // Refresca centro de reservas (prefijo), detalle y preview para no dejar estados obsoletos.
      void queryClient.invalidateQueries({ queryKey: ["reservations", propertyId, endpoint] });
      void queryClient.invalidateQueries({ queryKey: ["reservations", "no-show-preview", propertyId, endpoint, reservationId] });
    },
  });
}
