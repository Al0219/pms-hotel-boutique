import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { usePropertyReports } from "./use-property-reports";

const { listPropertyReportsMock } = vi.hoisted(() => ({ listPropertyReportsMock: vi.fn() }));

vi.mock("../service/property-report.service", () => ({ listPropertyReports: listPropertyReportsMock }));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("usePropertyReports", () => {
  beforeEach(() => {
    listPropertyReportsMock.mockReset();
  });

  it("maps the service DTO response to Domain data", async () => {
    listPropertyReportsMock.mockResolvedValueOnce({ reports: [{
      property_id: "GT-HB-01",
      property_name: "Hotel Boutique",
      start_date: "2026-09-01",
      end_date: "2026-09-15",
      metrics: {
        occupancy: 0.78,
        adr: "1250.50",
        revpar: "975.39",
        total_revenue: "45000.00",
        rooms_sold: 156,
        rooms_available: 200,
      },
      currency: "GTQ",
      timezone: "America/Guatemala",
    }] });

    const { result } = renderHook(() => usePropertyReports("GT-HB-01", "http://pms.test/contract/reports"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      expect.objectContaining({ propertyId: "GT-HB-01", propertyName: "Hotel Boutique", currency: "GTQ" }),
    ]);
    expect(listPropertyReportsMock).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "http://pms.test/contract/reports", propertyId: "GT-HB-01" }),
    );
  });

  it("does not request data without an authorized scope and confirmed endpoint", () => {
    renderHook(() => usePropertyReports(undefined, undefined), { wrapper: createWrapper() });

    expect(listPropertyReportsMock).not.toHaveBeenCalled();
  });

  it("exposes an error and allows refetch after a network failure", async () => {
    listPropertyReportsMock.mockRejectedValueOnce(new HttpNetworkError()).mockResolvedValueOnce({ reports: [] });

    const { result } = renderHook(() => usePropertyReports("GT-HB-01", "http://pms.test/contract/reports"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await result.current.refetch();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
