"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { mapGroup } from "../mappers/group.mapper";
import { addRoomingEntry, removeRoomingEntry } from "../service/group-rooming.service";

function invalidateGroups(queryClient: ReturnType<typeof useQueryClient>, propertyId: string | undefined, endpoint: string | undefined) {
  void queryClient.invalidateQueries({ queryKey: ["groups", propertyId, endpoint] });
}

export function useAddRoomingEntry(
  propertyId: string | undefined,
  endpoint: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, guestName, roomLabel }: { groupId: string; guestName: string; roomLabel: string }) => {
      if (!propertyId || !endpoint) {
        throw new Error("ROOMING_MUTATION_CONFIGURATION_REQUIRED");
      }

      const response = await addRoomingEntry({ endpoint, propertyId, groupId, guestName, roomLabel });
      return mapGroup(response);
    },
    onSuccess: () => invalidateGroups(queryClient, propertyId, endpoint),
  });
}

export function useRemoveRoomingEntry(
  propertyId: string | undefined,
  endpoint: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, entryId }: { groupId: string; entryId: string }) => {
      if (!propertyId || !endpoint) {
        throw new Error("ROOMING_MUTATION_CONFIGURATION_REQUIRED");
      }

      const response = await removeRoomingEntry({ endpoint, propertyId, groupId, entryId });
      return mapGroup(response);
    },
    onSuccess: () => invalidateGroups(queryClient, propertyId, endpoint),
  });
}
