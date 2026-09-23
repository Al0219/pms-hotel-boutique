import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { useMaintenanceOrders } from "./use-maintenance-orders";

const { listMaintenanceOrdersMock } = vi.hoisted(() => ({ listMaintenanceOrdersMock: vi.fn() }));

vi.mock("../service/maintenance-order.service", () => ({ listMaintenanceOrders: listMaintenanceOrdersMock }));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useMaintenanceOrders", () => {
  beforeEach(() => {
    listMaintenanceOrdersMock.mockReset();
  });

  it("maps the service DTO response to Domain data", async () => {
    listMaintenanceOrdersMock.mockResolvedValueOnce({ orders: [{
      order_id: "OT-001", property_id: "GT-HB-01", room_id: "101", title: "Fuga en baño", status: "OPEN", room_impact: "OOO", history: [],
    }] });

    const { result } = renderHook(() => useMaintenanceOrders("GT-HB-01", "http://pms.test/contract/maintenance-orders"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([expect.objectContaining({ id: "OT-001", roomId: "101", roomImpact: "OOO" })]);
    expect(listMaintenanceOrdersMock).toHaveBeenCalledWith(expect.objectContaining({ endpoint: "http://pms.test/contract/maintenance-orders", propertyId: "GT-HB-01" }));
  });

  it("does not request data without an authorized scope and confirmed endpoint", () => {
    renderHook(() => useMaintenanceOrders(undefined, undefined), { wrapper: createWrapper() });

    expect(listMaintenanceOrdersMock).not.toHaveBeenCalled();
  });

  it("exposes an error and allows refetch after a network failure", async () => {
    listMaintenanceOrdersMock
      .mockRejectedValueOnce(new HttpNetworkError())
      .mockResolvedValueOnce({ orders: [] });

    const { result } = renderHook(() => useMaintenanceOrders("GT-HB-01", "http://pms.test/contract/maintenance-orders"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await result.current.refetch();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
