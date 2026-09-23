import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { MaintenanceCenter } from "./maintenance-center";

afterEach(() => cleanup());

const { useMaintenanceOrdersMock } = vi.hoisted(() => ({ useMaintenanceOrdersMock: vi.fn() }));

vi.mock("../hooks/use-maintenance-orders", () => ({ useMaintenanceOrders: useMaintenanceOrdersMock }));

describe("MaintenanceCenter", () => {
  it("does not query until composition supplies an authorized scope", () => {
    useMaintenanceOrdersMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<MaintenanceCenter />);

    expect(screen.getByText(/scope de propiedad autorizado/i)).toBeInTheDocument();
  });

  it("renders the empty state for an explicit scope and approved endpoint", () => {
    useMaintenanceOrdersMock.mockReturnValue({ data: [], error: null, isLoading: false, refetch: vi.fn() });

    render(<MaintenanceCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/maintenance-orders" />);

    expect(screen.getByText("No hay órdenes de mantenimiento para esta propiedad.")).toBeInTheDocument();
  });

  it("presents a dedicated offline message", () => {
    useMaintenanceOrdersMock.mockReturnValue({ data: undefined, error: new HttpNetworkError(), isLoading: false, refetch: vi.fn() });

    render(<MaintenanceCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/maintenance-orders" />);

    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
  });
});
