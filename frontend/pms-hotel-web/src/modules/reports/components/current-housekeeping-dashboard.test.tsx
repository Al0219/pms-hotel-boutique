import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { CurrentHousekeepingDashboard } from "./current-housekeeping-dashboard";

const mocks = vi.hoisted(() => ({ report: vi.fn() }));
vi.mock("../hooks/use-current-housekeeping", () => ({ useCurrentHousekeeping: mocks.report }));
const props = { sessionId: "staff-1", scope: { kind: "PROPERTY" as const, propertyIds: ["property-1"] as [string] },
  propertyNames: { "property-1": "Hotel Uno" }, onBack: vi.fn() };
beforeEach(() => { mocks.report.mockReset(); mocks.report.mockReturnValue({ isPending: true, isSuccess: false, isError: false, isFetching: true, refetch: vi.fn() }); });
it("labels the current-only interpretation, untracked and DND without date filters", () => {
  render(<CurrentHousekeepingDashboard {...props} />);
  expect(mocks.report).toHaveBeenCalledWith("staff-1", props.scope);
  expect(screen.getByText(/Sin seguimiento significa que no hay estado/)).toBeInTheDocument();
  expect(screen.getByText(/DND es un indicador transversal/)).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Desde/)).not.toBeInTheDocument();
});
it("shows Backend counts including physical zeros and no financial numbers", () => {
  mocks.report.mockReturnValue({ isSuccess: true, isFetching: false, refetch: vi.fn(), data: {
    calculatedAt: "2035-01-01T12:00:00Z", rows: [{ propertyId: "property-1", timezone: "America/Guatemala",
      physicalRooms: 4, trackedRooms: 3, untrackedRooms: 1, dirtyRooms: 1, cleanRooms: 1, inspectedRooms: 1, dndRooms: 1 }],
  } });
  render(<CurrentHousekeepingDashboard {...props} />);
  expect(screen.getByRole("row", { name: /Hotel Uno.*America\/Guatemala.*4.*3.*1.*1.*1.*1.*1/ })).toBeInTheDocument();
  expect(screen.queryByText(/ADR|RevPAR|Ingresos/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Exportar/ })).not.toBeInTheDocument();
});
it("shows empty results and retries errors explicitly", () => {
  const refetch = vi.fn(); mocks.report.mockReturnValue({ isError: true, isFetching: false, refetch });
  const { rerender } = render(<CurrentHousekeepingDashboard {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" })); expect(refetch).toHaveBeenCalledTimes(1);
  mocks.report.mockReturnValue({ isSuccess: true, isFetching: false, refetch, data: { calculatedAt: "2035-01-01T12:00:00Z", rows: [] } });
  rerender(<CurrentHousekeepingDashboard {...props} />);
  expect(screen.getByText("No hay propiedades autorizadas con datos para esta consulta.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Actualizar estado actual" })); expect(refetch).toHaveBeenCalledTimes(2);
});
