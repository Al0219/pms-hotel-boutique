"use client";

import { useQuery } from "@tanstack/react-query";

import { mapMaintenanceOrder } from "../mappers/maintenance-order.mapper";
import { listMaintenanceOrders } from "../service/maintenance-order.service";

export function useMaintenanceOrders(propertyId: string | undefined, endpoint: string | undefined) {
  return useQuery({
    queryKey: ["maintenance-orders", propertyId, endpoint],
    enabled: Boolean(propertyId && endpoint),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint) {
        throw new Error("MAINTENANCE_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await listMaintenanceOrders({ endpoint, propertyId, signal });
      return response.orders.map(mapMaintenanceOrder);
    },
  });
}
