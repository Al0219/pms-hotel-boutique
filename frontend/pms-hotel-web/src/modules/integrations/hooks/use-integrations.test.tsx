import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { useIntegrations } from "./use-integrations";

const { listIntegrationsMock } = vi.hoisted(() => ({ listIntegrationsMock: vi.fn() }));

vi.mock("../service/integration.service", () => ({ listIntegrations: listIntegrationsMock }));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useIntegrations", () => {
  beforeEach(() => {
    listIntegrationsMock.mockReset();
  });

  it("maps the service DTO response to Domain data", async () => {
    listIntegrationsMock.mockResolvedValueOnce({ integrations: [{
      integration_id: "INT-001",
      property_id: "GT-HB-01",
      category: "Channels",
      provider: "Booking.com",
      adapter: "channel-booking",
      health: "HEALTHY",
      last_sync: "08 sep 2026 · 14:08",
      capabilities: ["Reservations"],
    }] });

    const { result } = renderHook(() => useIntegrations("GT-HB-01", "http://pms.test/contract/integrations"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      expect.objectContaining({ id: "INT-001", propertyId: "GT-HB-01", category: "Channels", health: "HEALTHY" }),
    ]);
    expect(listIntegrationsMock).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "http://pms.test/contract/integrations", propertyId: "GT-HB-01" }),
    );
  });

  it("does not request data without an authorized scope and confirmed endpoint", () => {
    renderHook(() => useIntegrations(undefined, undefined), { wrapper: createWrapper() });

    expect(listIntegrationsMock).not.toHaveBeenCalled();
  });

  it("exposes an error and allows refetch after a network failure", async () => {
    listIntegrationsMock.mockRejectedValueOnce(new HttpNetworkError()).mockResolvedValueOnce({ integrations: [] });

    const { result } = renderHook(() => useIntegrations("GT-HB-01", "http://pms.test/contract/integrations"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await result.current.refetch();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
