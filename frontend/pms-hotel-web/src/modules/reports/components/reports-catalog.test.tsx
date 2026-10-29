import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { ReportsCatalog } from "./reports-catalog";

vi.mock("./daily-on-books-dashboard", () => ({ DailyOnBooksDashboard: ({ onBack }: { onBack: () => void }) =>
  <div><h1>Detalle on-books</h1><button type="button" onClick={onBack}>Volver</button></div> }));
vi.mock("./daily-arrivals-departures-dashboard", () => ({ DailyArrivalsDeparturesDashboard: ({ onBack }: { onBack: () => void }) =>
  <div><h1>Detalle llegadas y salidas pendientes</h1><button type="button" onClick={onBack}>Volver</button></div> }));
vi.mock("./current-housekeeping-dashboard", () => ({ CurrentHousekeepingDashboard: ({ onBack }: { onBack: () => void }) =>
  <div><h1>Detalle housekeeping</h1><button type="button" onClick={onBack}>Volver</button></div> }));
vi.mock("./current-maintenance-dashboard", () => ({ CurrentMaintenanceDashboard: ({ onBack }: { onBack: () => void }) =>
  <div><h1>Detalle mantenimiento</h1><button type="button" onClick={onBack}>Volver</button></div> }));

const props = { sessionId: "staff-1", scope: { kind: "PROPERTY" as const, propertyIds: ["property-1"] as [string] },
  propertyNames: { "property-1": "Hotel Uno" }, canReadReservations: true, canReadHousekeeping: false };

it("shows the Figma catalog without fabricated report counts or financial values", () => {
  render(<ReportsCatalog {...props} />);
  expect(screen.getByRole("heading", { name: "Reportes y Analytics" })).toBeInTheDocument();
  expect(screen.getByText("Según los permisos de tu sesión")).toBeInTheDocument();
  for (const name of ["Operación", "Finanzas", "Cumplimiento", "Comercial"]) {
    expect(screen.getByRole("heading", { name })).toBeInTheDocument();
  }
  expect(screen.getAllByText("Pendiente de integración").length).toBeGreaterThan(0);
  expect(screen.queryByRole("button", { name: /Exportar|ADR|RevPAR/ })).not.toBeInTheDocument();
});

it("shows housekeeping and maintenance only to Operations and hides reservation actions without their permission", () => {
  render(<ReportsCatalog {...props} canReadReservations={false} canReadHousekeeping />);
  expect(screen.queryByRole("button", { name: "Abrir on-books de reservaciones" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Ver llegadas y salidas/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Ver housekeeping actual/ }));
  expect(screen.getByRole("heading", { name: "Detalle housekeeping" })).toBeInTheDocument();
});
it("opens maintenance separately and returns to the catalog", () => {
  const { unmount } = render(<ReportsCatalog {...props} canReadReservations={false} canReadHousekeeping />);
  expect(screen.getByText("2", { selector: "p" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Ver mantenimiento actual/ }));
  expect(screen.getByRole("heading", { name: "Detalle mantenimiento" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Volver" }));
  expect(screen.getByRole("heading", { name: "Reportes y Analytics" })).toBeInTheDocument();
  unmount();
  render(<ReportsCatalog {...props} />);
  expect(screen.queryByRole("button", { name: /Ver mantenimiento actual/ })).not.toBeInTheDocument();
});

it("opens the pending arrivals/departures view separately from on-books", () => {
  render(<ReportsCatalog {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /Ver llegadas y salidas pendientes/ }));
  expect(screen.getByRole("heading", { name: "Detalle llegadas y salidas pendientes" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Volver" }));
  expect(screen.getByRole("heading", { name: "Reportes y Analytics" })).toBeInTheDocument();
});

it("opens the real on-books view and returns to the catalog", () => {
  render(<ReportsCatalog {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir on-books de reservaciones" }));
  expect(screen.getByRole("heading", { name: "Detalle on-books" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Volver" }));
  expect(screen.getByRole("heading", { name: "Reportes y Analytics" })).toBeInTheDocument();
});
