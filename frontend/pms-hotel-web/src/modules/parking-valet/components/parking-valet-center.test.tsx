import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { ParkingValetCenter } from "./parking-valet-center";

afterEach(() => cleanup());

const { useValetRequestsMock } = vi.hoisted(() => ({ useValetRequestsMock: vi.fn() }));

vi.mock("../hooks/use-valet-requests", () => ({ useValetRequests: useValetRequestsMock }));

describe("ParkingValetCenter", () => {
  it("does not query until composition supplies an authorized scope", () => {
    useValetRequestsMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<ParkingValetCenter />);

    expect(screen.getByText(/scope de propiedad autorizado/i)).toBeInTheDocument();
  });

  it("renders the empty state for an explicit scope and approved endpoint", () => {
    useValetRequestsMock.mockReturnValue({ data: [], error: null, isLoading: false, refetch: vi.fn() });

    render(<ParkingValetCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/valet-requests" />);

    expect(screen.getByText("No hay solicitudes de parking/valet para esta propiedad.")).toBeInTheDocument();
  });

  it("presents a dedicated offline message", () => {
    useValetRequestsMock.mockReturnValue({ data: undefined, error: new HttpNetworkError(), isLoading: false, refetch: vi.fn() });

    render(<ParkingValetCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/valet-requests" />);

    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
  });

  it("renders a list of valet requests with status labels", () => {
    useValetRequestsMock.mockReturnValue({
      data: [
        { id: "VR-001", propertyId: "GT-HB-01", guestName: "María García", vehicleDescription: "ABC-123 Toyota Corolla", requestType: "VALET_IN", status: "PENDING", parkingSpace: null, notes: null },
        { id: "VR-002", propertyId: "GT-HB-01", guestName: "Carlos López", vehicleDescription: "XYZ-789 Honda Civic", requestType: "PARKING", status: "COMPLETED", parkingSpace: "P-05", notes: null },
      ],
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<ParkingValetCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/valet-requests" />);

    expect(screen.getAllByText("María García").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Carlos López").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("2 registradas")).toBeInTheDocument();
  });
});
