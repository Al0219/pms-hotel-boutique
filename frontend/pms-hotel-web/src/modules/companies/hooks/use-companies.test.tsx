import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { useCompanies } from "./use-companies";

const { listCompaniesMock } = vi.hoisted(() => ({ listCompaniesMock: vi.fn() }));

vi.mock("../service/company.service", () => ({ listCompanies: listCompaniesMock }));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useCompanies", () => {
  beforeEach(() => {
    listCompaniesMock.mockReset();
  });

  it("maps the service DTO response to Domain data", async () => {
    listCompaniesMock.mockResolvedValueOnce({ companies: [{
      company_id: "CMP-001", property_id: "GT-HB-01", legal_name: "Corporativo Maya", status_code: "ACTIVE",
      agreement_reference: null, credit_reference: null, direct_bill_requested: false,
    }] });

    const { result } = renderHook(() => useCompanies("GT-HB-01", "http://pms.test/contract/companies"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([expect.objectContaining({ id: "CMP-001", propertyId: "GT-HB-01" })]);
    expect(listCompaniesMock).toHaveBeenCalledWith(expect.objectContaining({ endpoint: "http://pms.test/contract/companies", propertyId: "GT-HB-01" }));
  });

  it("does not request data without an authorized scope and confirmed endpoint", () => {
    renderHook(() => useCompanies(undefined, undefined), { wrapper: createWrapper() });

    expect(listCompaniesMock).not.toHaveBeenCalled();
  });

  it("exposes an error and allows refetch after a network failure", async () => {
    listCompaniesMock
      .mockRejectedValueOnce(new HttpNetworkError())
      .mockResolvedValueOnce({ companies: [] });

    const { result } = renderHook(() => useCompanies("GT-HB-01", "http://pms.test/contract/companies"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await result.current.refetch();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
