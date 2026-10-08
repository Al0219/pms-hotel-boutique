import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { useOperationalMessages } from "./use-operational-messages";

const { listOperationalMessagesMock } = vi.hoisted(() => ({ listOperationalMessagesMock: vi.fn() }));

vi.mock("../service/operational-message.service", () => ({ listOperationalMessages: listOperationalMessagesMock }));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useOperationalMessages", () => {
  beforeEach(() => {
    listOperationalMessagesMock.mockReset();
  });

  it("maps the service DTO response to Domain data", async () => {
    listOperationalMessagesMock.mockResolvedValueOnce({ messages: [{
      message_id: "MSG-001",
      property_id: "GT-HB-01",
      subject: "Servicio de habitación pendiente",
      body: "Habitación 302 solicita amenities adicionales.",
      sender_role: "OPERATIONS",
      status: "PENDING",
      related_reservation_id: null,
      created_at: "2026-09-18T10:30:00Z",
    }] });

    const { result } = renderHook(() => useOperationalMessages("GT-HB-01", "http://pms.test/contract/operational-messages"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([expect.objectContaining({ id: "MSG-001", propertyId: "GT-HB-01" })]);
    expect(listOperationalMessagesMock).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "http://pms.test/contract/operational-messages", propertyId: "GT-HB-01" }),
    );
  });

  it("does not request data without an authorized scope and confirmed endpoint", () => {
    renderHook(() => useOperationalMessages(undefined, undefined), { wrapper: createWrapper() });

    expect(listOperationalMessagesMock).not.toHaveBeenCalled();
  });

  it("exposes an error and allows refetch after a network failure", async () => {
    listOperationalMessagesMock.mockRejectedValueOnce(new HttpNetworkError()).mockResolvedValueOnce({ messages: [] });

    const { result } = renderHook(() => useOperationalMessages("GT-HB-01", "http://pms.test/contract/operational-messages"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await result.current.refetch();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
