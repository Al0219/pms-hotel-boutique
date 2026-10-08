"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mapWaitlistConversionPreview, mapWaitlistConversionResult } from "../mappers/waitlist.mapper";
import { confirmWaitlistConversion, previewWaitlistConversion } from "../service/waitlist.service";

export function useWaitlistConversionPreview(
  propertyId: string | undefined,
  endpoint: string | undefined,
  waitlistId: string | undefined,
) {
  return useQuery({
    queryKey: ["waitlist", "preview", propertyId, endpoint, waitlistId],
    enabled: Boolean(propertyId && endpoint && waitlistId),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint || !waitlistId) {
        throw new Error("WAITLIST_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await previewWaitlistConversion({ endpoint, propertyId, waitlistId, signal });
      return mapWaitlistConversionPreview(response);
    },
  });
}

export function useConfirmWaitlistConversion(
  propertyId: string | undefined,
  endpoint: string | undefined,
  waitlistId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!propertyId || !endpoint || !waitlistId) {
        throw new Error("WAITLIST_MUTATION_CONFIGURATION_REQUIRED");
      }

      const response = await confirmWaitlistConversion({ endpoint, propertyId, waitlistId });
      return mapWaitlistConversionResult(response);
    },
    onSuccess: () => {
      // La entrada no puede quedar OPEN tras una conversión exitosa: se refrescan
      // el Centro de Reservas y el preview para reflejar el estado real del servidor.
      void queryClient.invalidateQueries({ queryKey: ["reservations", propertyId, endpoint] });
      void queryClient.invalidateQueries({ queryKey: ["waitlist", "preview", propertyId, endpoint, waitlistId] });
    },
  });
}