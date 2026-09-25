"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { mapRoomStatusChangeResult } from "../mappers/room-status-change.mapper";
import type { RoomStatus } from "../model/room";
import { changeRoomStatus } from "../service/room-status-change.service";

export function useChangeRoomStatus(
  propertyId: string | undefined,
  endpoint: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, toStatus, reason, startDate, endDate }: {
      roomId: string;
      toStatus: RoomStatus;
      reason: string;
      startDate: string | null;
      endDate: string | null;
    }) => {
      if (!propertyId || !endpoint) {
        throw new Error("ROOM_STATUS_CHANGE_MUTATION_CONFIGURATION_REQUIRED");
      }

      const response = await changeRoomStatus({ endpoint, propertyId, roomId, toStatus, reason, startDate, endDate });
      return mapRoomStatusChangeResult(response);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rooms", propertyId, endpoint] });
    },
  });
}
