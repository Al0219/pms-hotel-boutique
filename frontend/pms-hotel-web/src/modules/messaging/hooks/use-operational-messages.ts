"use client";

import { useQuery } from "@tanstack/react-query";

import { mapOperationalMessage } from "../mappers/operational-message.mapper";
import { listOperationalMessages } from "../service/operational-message.service";

export function useOperationalMessages(propertyId: string | undefined, endpoint: string | undefined) {
  return useQuery({
    queryKey: ["operational-messages", propertyId, endpoint],
    enabled: Boolean(propertyId && endpoint),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint) {
        throw new Error("MESSAGING_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await listOperationalMessages({ endpoint, propertyId, signal });
      return response.messages.map(mapOperationalMessage);
    },
  });
}
