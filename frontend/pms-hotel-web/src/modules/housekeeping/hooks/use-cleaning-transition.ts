"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mapCleaningTransitionResult, mapDiscrepancyResolution } from "../mappers/room-cleaning-transition.mapper";
import type { RoomCleaningStatus } from "../model/room-cleaning";
import {
  applyCleaningTransition,
  listDiscrepancyResolutions,
  resolveDiscrepancy,
} from "../service/room-cleaning-transition.service";

export function useApplyCleaningTransition(
  propertyId: string | undefined,
  endpoint: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, toStatus, reason }: { roomId: string; toStatus: RoomCleaningStatus; reason: string | null }) => {
      if (!propertyId || !endpoint) {
        throw new Error("CLEANING_TRANSITION_MUTATION_CONFIGURATION_REQUIRED");
      }

      const response = await applyCleaningTransition({ endpoint, propertyId, roomId, toStatus, reason });
      return mapCleaningTransitionResult(response);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["room-cleaning", propertyId, endpoint] });
      void queryClient.invalidateQueries({ queryKey: ["room-cleaning", "discrepancy-resolutions", propertyId, endpoint] });
    },
  });
}

export function useDiscrepancyResolutions(
  propertyId: string | undefined,
  endpoint: string | undefined,
) {
  return useQuery({
    queryKey: ["room-cleaning", "discrepancy-resolutions", propertyId, endpoint],
    enabled: Boolean(propertyId && endpoint),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint) {
        throw new Error("DISCREPANCY_RESOLUTIONS_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await listDiscrepancyResolutions({ endpoint, propertyId, signal });
      return response.resolutions.map(mapDiscrepancyResolution);
    },
  });
}

export function useResolveDiscrepancy(
  propertyId: string | undefined,
  endpoint: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, reason }: { roomId: string; reason: string }) => {
      if (!propertyId || !endpoint) {
        throw new Error("DISCREPANCY_RESOLUTION_MUTATION_CONFIGURATION_REQUIRED");
      }

      const response = await resolveDiscrepancy({ endpoint, propertyId, roomId, reason });
      return response.resolutions.map(mapDiscrepancyResolution);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["room-cleaning", "discrepancy-resolutions", propertyId, endpoint] });
      void queryClient.invalidateQueries({ queryKey: ["room-cleaning", propertyId, endpoint] });
    },
  });
}
