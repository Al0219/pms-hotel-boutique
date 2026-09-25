"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mapRoomMoveApply, mapRoomMovePreview } from "../mappers/room-move.mapper";
import { applyRoomMove, previewRoomMove } from "../service/room-move.service";

/** Preview habilitado solo mientras el panel de cambio de habitación está abierto. */
export function useRoomMovePreview(
  propertyId: string | undefined,
  endpoint: string | undefined,
  reservationId: string | undefined,
  stayId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["stays", "room-move-preview", propertyId, endpoint, reservationId, stayId],
    enabled: Boolean(propertyId && endpoint && reservationId && stayId && enabled),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint || !reservationId || !stayId) {
        throw new Error("ROOM_MOVE_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await previewRoomMove({ endpoint, propertyId, reservationId, stayId, signal });
      return mapRoomMovePreview(response);
    },
  });
}

export interface ApplyRoomMoveVariables {
  targetRoomId: string;
  reason: string | null;
}

export function useApplyRoomMove(
  propertyId: string | undefined,
  endpoint: string | undefined,
  reservationId: string | undefined,
  stayId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetRoomId, reason }: ApplyRoomMoveVariables) => {
      if (!propertyId || !endpoint || !reservationId || !stayId) {
        throw new Error("ROOM_MOVE_MUTATION_CONFIGURATION_REQUIRED");
      }

      const response = await applyRoomMove({ endpoint, propertyId, reservationId, stayId, targetRoomId, reason });
      return mapRoomMoveApply(response);
    },
    onSuccess: () => {
      // Refresca detalle de la reserva (stay/room assignment) y preview para no dejar estados obsoletos.
      void queryClient.invalidateQueries({ queryKey: ["reservations", propertyId, endpoint] });
      void queryClient.invalidateQueries({
        queryKey: ["stays", "room-move-preview", propertyId, endpoint, reservationId, stayId],
      });
    },
  });
}