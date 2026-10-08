import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { useAgencies } from "./use-agencies";

const { listAgenciesMock } = vi.hoisted(() => ({ listAgenciesMock: vi.fn() }));

vi.mock("../service/agency.service", () => ({ listAgencies: listAgenciesMock }));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useAgencies", () => {
  beforeEach(() => {
    listAgenciesMock.mockReset();
  });

  it("maps the service DTO response to Domain data", async () => {
    listAgenciesMock.mockResolvedValueOnce({ agencies: [{
      agency_id: "AGY-001", property_id: "GT-HB-01", legal_name: "Viajes Quetzal", status_code: "ACTIVE",
      contract_reference: null, commission_reference: null, voucher_reference: null,
    }] });

    const { result } = renderHook(() => useAgencies("GT-HB-01", "http://pms.test/contract/agencies"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([expect.objectContaining({ id: "AGY-001", propertyId: "GT-HB-01" })]);
    expect(listAgenciesMock).toHaveBeenCalledWith(expect.objectContaining({ endpoint: "http://pms.test/contract/agencies", propertyId: "GT-HB-01" }));
  });

  it("does not request data without an authorized scope and confirmed endpoint", () => {
    renderHook(() => useAgencies(undefined, undefined), { wrapper: createWrapper() });

    expect(listAgenciesMock).not.toHaveBeenCalled();
  });

  it("exposes an error and allows refetch after a network failure", async () => {
    listAgenciesMock
      .mockRejectedValueOnce(new HttpNetworkError())
      .mockResolvedValueOnce({ agencies: [] });

    const { result } = renderHook(() => useAgencies("GT-HB-01", "http://pms.test/contract/agencies"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await result.current.refetch();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
