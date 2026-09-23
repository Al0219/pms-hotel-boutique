import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { useGroups } from "./use-groups";

const { listGroupsMock } = vi.hoisted(() => ({ listGroupsMock: vi.fn() }));

vi.mock("../service/group.service", () => ({ listGroups: listGroupsMock }));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useGroups", () => {
  beforeEach(() => {
    listGroupsMock.mockReset();
  });

  it("maps the service DTO response to Domain data", async () => {
    listGroupsMock.mockResolvedValueOnce({ groups: [{
      group_id: "GRP-001", property_id: "GT-HB-01", name: "Convención Maya", lifecycle_status: "TENTATIVE",
      room_block_reference: null, audit_reference: null,
    }] });

    const { result } = renderHook(() => useGroups("GT-HB-01", "http://pms.test/contract/groups"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([expect.objectContaining({ id: "GRP-001", propertyId: "GT-HB-01", status: "TENTATIVE" })]);
    expect(listGroupsMock).toHaveBeenCalledWith(expect.objectContaining({ endpoint: "http://pms.test/contract/groups", propertyId: "GT-HB-01" }));
  });

  it("does not request data without an authorized scope and confirmed endpoint", () => {
    renderHook(() => useGroups(undefined, undefined), { wrapper: createWrapper() });

    expect(listGroupsMock).not.toHaveBeenCalled();
  });

  it("exposes an error and allows refetch after a network failure", async () => {
    listGroupsMock
      .mockRejectedValueOnce(new HttpNetworkError())
      .mockResolvedValueOnce({ groups: [] });

    const { result } = renderHook(() => useGroups("GT-HB-01", "http://pms.test/contract/groups"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await result.current.refetch();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
