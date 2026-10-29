import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { CurrentMaintenanceDashboard } from "./current-maintenance-dashboard";

const mocks = vi.hoisted(() => ({ report: vi.fn() }));
vi.mock("../hooks/use-current-maintenance", () => ({ useCurrentMaintenance: mocks.report }));
const props = { sessionId: "staff-1", scope: { kind: "PROPERTY" as const, propertyIds: ["property-1"] as [string] },
  propertyNames: { "property-1": "Hotel Uno" }, onBack: vi.fn() };
beforeEach(() => { mocks.report.mockReset(); mocks.report.mockReturnValue({ isPending: true, isSuccess: false, isError: false, isFetching: true, refetch: vi.fn() }); });
it("labels the current-only interpretation and overlapping subsets", () => {
  render(<CurrentMaintenanceDashboard {...props} />);
  expect(mocks.report).toHaveBeenCalledWith("staff-1", props.scope);
  expect(screen.getByText(/No representa actividad histórica/)).toBeInTheDocument();
  expect(screen.getByText(/subconjuntos que pueden solaparse/)).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Desde/)).not.toBeInTheDocument();
});
it("shows Backend counts including zero and no financial numbers", () => {
  mocks.report.mockReturnValue({ isSuccess: true, isFetching: false, refetch: vi.fn(), data: {
    calculatedAt: "2035-01-01T12:00:00Z", rows: [{ propertyId: "property-1", timezone: "America/Guatemala",
      openOrders: 2, inProgressOrders: 1, unresolvedOrders: 3, urgentUnresolvedOrders: 1,
      unassignedUnresolvedOrders: 2, roomLinkedUnresolvedOrders: 2, commonAreaUnresolvedOrders: 1 }],
  } });
  render(<CurrentMaintenanceDashboard {...props} />);
  expect(screen.getByRole("row", { name: /Hotel Uno.*America\/Guatemala.*3.*2.*1.*1.*2.*2.*1/ })).toBeInTheDocument();
  expect(screen.queryByText(/ADR|RevPAR|Ingresos/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Exportar/ })).not.toBeInTheDocument();
});
it("shows empty results and retries errors explicitly", () => {
  const refetch = vi.fn(); mocks.report.mockReturnValue({ isError: true, isFetching: false, refetch });
  const { rerender } = render(<CurrentMaintenanceDashboard {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" })); expect(refetch).toHaveBeenCalledTimes(1);
  mocks.report.mockReturnValue({ isSuccess: true, isFetching: false, refetch, data: { calculatedAt: "2035-01-01T12:00:00Z", rows: [] } });
  rerender(<CurrentMaintenanceDashboard {...props} />);
  expect(screen.getByText("No hay propiedades autorizadas con datos para esta consulta.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Actualizar estado actual" })); expect(refetch).toHaveBeenCalledTimes(2);
});
