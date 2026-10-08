"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mapStayExtensionApply, mapStayExtensionPreview } from "../mappers/stay-extension.mapper";
import { applyStayExtension, previewStayExtension } from "../service/stay-extension.service";

/**
 * Preview de la extensión para la salida solicitada.
 * Se consulta solo cuando el usuario revalida una fecha de salida concreta.
 */
export function useExtensionPreview(
  propertyId: string | undefined,
  endpoint: string | undefined,
  reservationId: string | undefined,
  stayId: string | undefined,
  newDeparture: string | undefined,
) {
  return useQuery({
    queryKey: ["stays", "extension-preview", propertyId, endpoint, reservationId, stayId, newDeparture],
    enabled: Boolean(propertyId && endpoint && reservationId && stayId && newDeparture),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint || !reservationId || !stayId || !newDeparture) {
        throw new Error("STAY_EXTENSION_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await previewStayExtension({
        endpoint,
        propertyId,
        reservationId,
        stayId,
        newDeparture,
        signal,
      });
      return mapStayExtensionPreview(response);
    },
  });
}

export interface ApplyStayExtensionVariables {
  /** Nueva salida "YYYY-MM-DD" ya revalidada en el preview. */
  newDeparture: string;
  reason: string | null;
}

export function useApplyStayExtension(
  propertyId: string | undefined,
  endpoint: string | undefined,
  reservationId: string | undefined,
  stayId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ newDeparture, reason }: ApplyStayExtensionVariables) => {
      if (!propertyId || !endpoint || !reservationId || !stayId) {
        throw new Error("STAY_EXTENSION_MUTATION_CONFIGURATION_REQUIRED");
      }

      const response = await applyStayExtension({
        endpoint,
        propertyId,
        reservationId,
        stayId,
        newDeparture,
        reason,
      });
      return mapStayExtensionApply(response);
    },
    onSuccess: () => {
      // Refresca detalle de la reserva (nueva salida/noches) y preview para no dejar estados obsoletos.
      void queryClient.invalidateQueries({ queryKey: ["reservations", propertyId, endpoint] });
      void queryClient.invalidateQueries({
        queryKey: ["stays", "extension-preview", propertyId, endpoint, reservationId, stayId],
      });
    },
  });
}