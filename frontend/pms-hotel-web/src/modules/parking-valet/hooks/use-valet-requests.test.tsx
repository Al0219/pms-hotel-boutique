import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { useValetRequests } from "./use-valet-requests";

const { listValetRequestsMock } = vi.hoisted(() => ({ listValetRequestsMock: vi.fn() }));

vi.mock("../service/valet-request.service", () => ({ listValetRequests: listValetRequestsMock }));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useValetRequests", () => {
  beforeEach(() => {
    listValetRequestsMock.mockReset();
  });

  it("maps the service DTO response to Domain data", async () => {
    listValetRequestsMock.mockResolvedValueOnce({ requests: [{
      request_id: "VR-001",
      property_id: "GT-HB-01",
      guest_name: "María García",
      vehicle_description: "ABC-123 Toyota Corolla",
      request_type: "VALET_IN",
      status: "PENDING",
      parking_space: null,
      notes: null,
    }] });

    const { result } = renderHook(() => useValetRequests("GT-HB-01", "http://pms.test/contract/valet-requests"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([expect.objectContaining({ id: "VR-001", propertyId: "GT-HB-01" })]);
    expect(listValetRequestsMock).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "http://pms.test/contract/valet-requests", propertyId: "GT-HB-01" }),
    );
  });

  it("does not request data without an authorized scope and confirmed endpoint", () => {
    renderHook(() => useValetRequests(undefined, undefined), { wrapper: createWrapper() });

    expect(listValetRequestsMock).not.toHaveBeenCalled();
  });

  it("exposes an error and allows refetch after a network failure", async () => {
    listValetRequestsMock.mockRejectedValueOnce(new HttpNetworkError()).mockResolvedValueOnce({ requests: [] });

    const { result } = renderHook(() => useValetRequests("GT-HB-01", "http://pms.test/contract/valet-requests"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await result.current.refetch();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
