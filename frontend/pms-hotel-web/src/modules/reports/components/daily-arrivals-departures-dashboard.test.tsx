import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { DailyArrivalsDeparturesDashboard } from "./daily-arrivals-departures-dashboard";

const mocks = vi.hoisted(() => ({ report: vi.fn() }));
vi.mock("../hooks/use-daily-arrivals-departures", () => ({ useDailyArrivalsDepartures: mocks.report }));
const props = { sessionId: "staff-1", scope: { kind: "PROPERTY" as const, propertyIds: ["property-1"] as [string] },
  propertyNames: { "property-1": "Hotel Uno" }, onBack: vi.fn() };
beforeEach(() => {
  mocks.report.mockReset(); mocks.report.mockReturnValue({ isPending: true, fetchStatus: "idle", isSuccess: false, isError: false, refetch: vi.fn() });
});
function apply(from = "2035-01-01", to = "2035-01-03") {
  fireEvent.change(screen.getByLabelText("Desde (día local)"), { target: { value: from } });
  fireEvent.change(screen.getByLabelText("Hasta (día local)"), { target: { value: to } });
  fireEvent.click(screen.getByRole("button", { name: "Consultar reporte" }));
}
it("requires explicit valid local dates and explains pending versus actual movements", () => {
  render(<DailyArrivalsDeparturesDashboard {...props} />);
  expect(mocks.report).toHaveBeenCalledWith("staff-1", props.scope, null, null);
  expect(screen.getByText(/Movimientos realizados e histórico no disponibles/)).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument(); apply("2035-01-02", "2035-01-01");
  expect(screen.getByRole("alert")).toHaveTextContent("hasta 366 días");
  expect(mocks.report).toHaveBeenLastCalledWith("staff-1", props.scope, null, null);
  apply(); expect(mocks.report).toHaveBeenLastCalledWith("staff-1", props.scope, "2035-01-01", "2035-01-03");
  apply("2035-01-03", "2035-01-01");
  expect(mocks.report).toHaveBeenLastCalledWith("staff-1", props.scope, null, null);
  expect(screen.queryByText(/Período consultado:/)).not.toBeInTheDocument();
});
it("displays counts supplied by Backend and real zeros without financial metrics", () => {
  mocks.report.mockReturnValue({ isPending: false, isSuccess: true, isError: false, refetch: vi.fn(),
    data: { calculatedAt: "2035-01-01T12:00:00Z", rows: [{ propertyId: "property-1", date: "2035-01-01", timezone: "America/Guatemala", currency: "GTQ", pendingArrivals: 0, pendingDepartures: 3 }] } });
  render(<DailyArrivalsDeparturesDashboard {...props} />); apply();
  expect(screen.getByRole("row", { name: /Hotel Uno.*2035-01-01.*America\/Guatemala.*GTQ.*0.*3/ })).toBeInTheDocument();
  expect(screen.queryByText(/ADR|RevPAR|Ingresos/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Exportar/ })).not.toBeInTheDocument();
});
it("shows empty results and retries source failures explicitly", () => {
  const refetch = vi.fn(); mocks.report.mockReturnValue({ isError: true, refetch });
  const { rerender } = render(<DailyArrivalsDeparturesDashboard {...props} />); apply();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" })); expect(refetch).toHaveBeenCalledTimes(1);
  mocks.report.mockReturnValue({ isSuccess: true, refetch, data: { calculatedAt: "2035-01-01T12:00:00Z", rows: [] } });
  rerender(<DailyArrivalsDeparturesDashboard {...props} />);
  expect(screen.getByText("No hay filas para las fechas y propiedades seleccionadas.")).toBeInTheDocument();
});
it("paginates a large real response without rendering every row at once", () => {
  const rows = Array.from({ length: 101 }, (_, index) => ({ propertyId: "property-1",
    date: new Date(Date.UTC(2035, 0, index + 1)).toISOString().slice(0, 10), timezone: "America/Guatemala",
    currency: "GTQ", pendingArrivals: index, pendingDepartures: 0 }));
  mocks.report.mockReturnValue({ isSuccess: true, data: { calculatedAt: "2035-01-01T12:00:00Z", rows } });
  render(<DailyArrivalsDeparturesDashboard {...props} />); apply("2035-01-01", "2035-04-11");
  expect(screen.getByText("Mostrando 1–100 de 101 filas.")).toBeInTheDocument();
  expect(screen.getAllByRole("row")).toHaveLength(101);
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  expect(screen.getByText("Mostrando 101–101 de 101 filas.")).toBeInTheDocument();
  expect(screen.getAllByRole("row")).toHaveLength(2);
});
