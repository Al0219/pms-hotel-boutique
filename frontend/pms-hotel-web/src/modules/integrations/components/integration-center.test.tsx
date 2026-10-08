import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import type { Integration } from "../model/integration";

import { IntegrationCenter } from "./integration-center";

afterEach(() => cleanup());

const { useIntegrationsMock } = vi.hoisted(() => ({ useIntegrationsMock: vi.fn() }));

vi.mock("../hooks/use-integrations", () => ({ useIntegrations: useIntegrationsMock }));

const BASE: Integration = {
  id: "INT-001",
  propertyId: "GT-HB-01",
  category: "Channels",
  provider: "Booking.com",
  adapter: "channel-booking",
  health: "HEALTHY",
  lastSync: "08 sep 2026 · 14:08",
  capabilities: ["Reservations", "Rates", "Inventory", "Restrictions"],
};

const INTEGRATIONS: Integration[] = [
  BASE,
  { ...BASE, id: "INT-002", category: "Payments", provider: "PSP", adapter: null, health: "HEALTHY", capabilities: ["Capture"] },
  { ...BASE, id: "INT-003", category: "POS", provider: "Point of Sale", adapter: null, health: "ATTENTION", capabilities: ["Charges"] },
  { ...BASE, id: "INT-004", category: "Fiscal", provider: "SAT/FEL", adapter: null, health: "HEALTHY", capabilities: ["Invoices"] },
  { ...BASE, id: "INT-005", category: "Locks", provider: "Lock provider", adapter: null, health: "DEGRADED", capabilities: ["Keys"] },
  { ...BASE, id: "INT-006", category: "Messaging", provider: "Message provider", adapter: null, health: "HEALTHY", capabilities: ["Notifications"] },
  { ...BASE, id: "INT-007", category: "Accounting", provider: "Accounting provider", adapter: null, health: "CONFIGURED", capabilities: [] },
];

describe("IntegrationCenter", () => {
  it("presents the seven documented categories with coherent health counts and no secrets", () => {
    useIntegrationsMock.mockReturnValue({ data: INTEGRATIONS, error: null, isLoading: false, refetch: vi.fn() });

    render(<IntegrationCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/integrations" />);

    expect(screen.getByRole("heading", { name: "Integration Center" })).toBeInTheDocument();
    for (const category of ["Channels", "Payments", "POS", "Fiscal", "Locks", "Messaging", "Accounting"]) {
      expect(screen.getByText(category)).toBeInTheDocument();
    }
    const summary = within(screen.getByLabelText("Resumen de integraciones"));
    expect(summary.getByText("Categorías")).toBeInTheDocument();
    expect(summary.getByText("7")).toBeInTheDocument();
    expect(summary.getByText("Saludables")).toBeInTheDocument();
    expect(summary.getByText("4")).toBeInTheDocument();
    expect(summary.getByText("Requieren revisión")).toBeInTheDocument();
    expect(summary.getByText("2")).toBeInTheDocument();
    expect(summary.getByText("Configuradas")).toBeInTheDocument();
    expect(summary.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Booking.com")).toBeInTheDocument();
    expect(screen.getByText("channel-booking")).toBeInTheDocument();
    expect(screen.getByText(/Reservations · Rates · Inventory · Restrictions/)).toBeInTheDocument();
    expect(screen.queryByText(/secret|password|credential/i)).not.toBeInTheDocument();
  });

  it("does not query until composition supplies an authorized scope", () => {
    useIntegrationsMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<IntegrationCenter />);

    expect(screen.getByText(/scope de propiedad autorizado/i)).toBeInTheDocument();
  });

  it("renders the empty state for an explicit scope and approved endpoint", () => {
    useIntegrationsMock.mockReturnValue({ data: [], error: null, isLoading: false, refetch: vi.fn() });

    render(<IntegrationCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/integrations" />);

    expect(screen.getByText("No hay integraciones para esta propiedad.")).toBeInTheDocument();
  });

  it("presents a dedicated offline message", () => {
    useIntegrationsMock.mockReturnValue({ data: undefined, error: new HttpNetworkError(), isLoading: false, refetch: vi.fn() });

    render(<IntegrationCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/integrations" />);

    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
  });

  it("opens the integration detail with health in Spanish and a deep link to its errors", () => {
    useIntegrationsMock.mockReturnValue({ data: INTEGRATIONS, error: null, isLoading: false, refetch: vi.fn() });

    render(<IntegrationCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/integrations" />);

    fireEvent.click(screen.getByRole("button", { name: "Ver detalle de Booking.com" }));

    expect(screen.getByRole("heading", { name: "Booking.com" })).toBeInTheDocument();
    expect(screen.getAllByText("Saludable").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: "Ver errores de Booking.com" })).toHaveAttribute(
      "href",
      "/integraciones/errores?integrationId=INT-001",
    );
    expect(screen.getByRole("link", { name: "Ver cola de errores" })).toHaveAttribute("href", "/integraciones/errores");
  });
});
