"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mapIntegrationError } from "../mappers/integration-error.mapper";
import { listIntegrationErrors, retryIntegrationError } from "../service/integration-error.service";

export function useIntegrationErrors(
  propertyId: string | undefined,
  endpoint: string | undefined,
) {
  return useQuery({
    queryKey: ["integration-errors", propertyId, endpoint],
    enabled: Boolean(propertyId && endpoint),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint) {
        throw new Error("INTEGRATION_ERRORS_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await listIntegrationErrors({ endpoint, propertyId, signal });
      return response.errors.map(mapIntegrationError);
    },
  });
}

export function useRetryIntegrationError(
  propertyId: string | undefined,
  endpoint: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ errorId, idempotencyKey }: { errorId: string; idempotencyKey: string }) => {
      if (!propertyId || !endpoint) {
        throw new Error("INTEGRATION_ERROR_RETRY_CONFIGURATION_REQUIRED");
      }

      const response = await retryIntegrationError({ endpoint, propertyId, errorId, idempotencyKey });
      return mapIntegrationError(response);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integration-errors", propertyId, endpoint] });
    },
  });
}
