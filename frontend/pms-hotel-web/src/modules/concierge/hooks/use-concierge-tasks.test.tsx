import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { useConciergeTasks } from "./use-concierge-tasks";

const { listConciergeTasksMock } = vi.hoisted(() => ({ listConciergeTasksMock: vi.fn() }));

vi.mock("../service/concierge-task.service", () => ({ listConciergeTasks: listConciergeTasksMock }));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useConciergeTasks", () => {
  beforeEach(() => {
    listConciergeTasksMock.mockReset();
  });

  it("maps the service DTO response to Domain data", async () => {
    listConciergeTasksMock.mockResolvedValueOnce({ tasks: [{
      task_id: "CT-001",
      property_id: "GT-HB-01",
      title: "Traslado al aeropuerto",
      status: "PENDING",
      reception_reference: null,
    }] });

    const { result } = renderHook(() => useConciergeTasks("GT-HB-01", "http://pms.test/contract/concierge-tasks"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([expect.objectContaining({ id: "CT-001", propertyId: "GT-HB-01" })]);
    expect(listConciergeTasksMock).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "http://pms.test/contract/concierge-tasks", propertyId: "GT-HB-01" }),
    );
  });

  it("does not request data without an authorized scope and confirmed endpoint", () => {
    renderHook(() => useConciergeTasks(undefined, undefined), { wrapper: createWrapper() });

    expect(listConciergeTasksMock).not.toHaveBeenCalled();
  });

  it("exposes an error and allows refetch after a network failure", async () => {
    listConciergeTasksMock.mockRejectedValueOnce(new HttpNetworkError()).mockResolvedValueOnce({ tasks: [] });

    const { result } = renderHook(() => useConciergeTasks("GT-HB-01", "http://pms.test/contract/concierge-tasks"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await result.current.refetch();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
