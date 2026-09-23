import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import type { PropertyReport } from "../model/property-report";

import { ReportsDashboard } from "./reports-dashboard";

afterEach(() => cleanup());

const { usePropertyReportsMock } = vi.hoisted(() => ({ usePropertyReportsMock: vi.fn() }));

vi.mock("../hooks/use-property-reports", () => ({ usePropertyReports: usePropertyReportsMock }));

const BASE: PropertyReport = {
  propertyId: "GT-HB-01",
  propertyName: "Hotel Boutique Guatemala",
  dateRange: {
    startDate: new Date("2026-09-01T00:00:00"),
    endDate: new Date("2026-09-15T00:00:00"),
  },
  metrics: {
    occupancy: 0.78,
    adr: 1250.5,
    revpar: 975.39,
    totalRevenue: 45000,
    roomsSold: 156,
    roomsAvailable: 200,
  },
  currency: "GTQ",
  timezone: "America/Guatemala",
};

const REPORTS: PropertyReport[] = [
  BASE,
  {
    ...BASE,
    propertyId: "GT-HB-02",
    propertyName: "Hotel Lake Atitlán",
    metrics: {
      occupancy: 0.65,
      adr: 1800,
      revpar: 1170,
      totalRevenue: 63000,
      roomsSold: 130,
      roomsAvailable: 200,
    },
  },
];

describe("ReportsDashboard", () => {
  it("presents KPI summary cards and per-property breakdown with no secrets", () => {
    usePropertyReportsMock.mockReturnValue({ data: REPORTS, error: null, isLoading: false, refetch: vi.fn() });

    render(<ReportsDashboard propertyId="GT-HB-01" endpoint="http://pms.test/contract/reports" />);

    expect(screen.getByRole("heading", { name: "Reports" })).toBeInTheDocument();

    const summary = within(screen.getByLabelText("Resumen de reportes"));
    expect(summary.getByText("Ocupación")).toBeInTheDocument();
    expect(summary.getByText("ADR")).toBeInTheDocument();
    expect(summary.getByText("RevPAR")).toBeInTheDocument();
    expect(summary.getByText("Ingresos totales")).toBeInTheDocument();

    expect(screen.getByText("Hotel Boutique Guatemala")).toBeInTheDocument();
    expect(screen.getByText("Hotel Lake Atitlán")).toBeInTheDocument();
    expect(screen.queryByText(/secret|password|credential/i)).not.toBeInTheDocument();
  });

  it("does not query until composition supplies an authorized scope", () => {
    usePropertyReportsMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<ReportsDashboard />);

    expect(screen.getByText(/scope de propiedad autorizado/i)).toBeInTheDocument();
  });

  it("renders the empty state for an explicit scope and approved endpoint", () => {
    usePropertyReportsMock.mockReturnValue({ data: [], error: null, isLoading: false, refetch: vi.fn() });

    render(<ReportsDashboard propertyId="GT-HB-01" endpoint="http://pms.test/contract/reports" />);

    expect(screen.getByText("No hay reportes para esta propiedad.")).toBeInTheDocument();
  });

  it("presents a dedicated offline message", () => {
    usePropertyReportsMock.mockReturnValue({ data: undefined, error: new HttpNetworkError(), isLoading: false, refetch: vi.fn() });

    render(<ReportsDashboard propertyId="GT-HB-01" endpoint="http://pms.test/contract/reports" />);

    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
  });

  it("presents a pending endpoint message when no endpoint is provided", () => {
    usePropertyReportsMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<ReportsDashboard propertyId="GT-HB-01" />);

    expect(screen.getByText(/contrato API con Backend/i)).toBeInTheDocument();
  });
});
