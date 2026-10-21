import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { ReportsCatalog } from "./reports-catalog";

vi.mock("./daily-on-books-dashboard", () => ({ DailyOnBooksDashboard: ({ onBack }: { onBack: () => void }) =>
  <div><h1>Detalle on-books</h1><button type="button" onClick={onBack}>Volver</button></div> }));

const props = { sessionId: "staff-1", scope: { kind: "PROPERTY" as const, propertyIds: ["property-1"] as [string] },
  propertyNames: { "property-1": "Hotel Uno" } };

it("shows the Figma catalog without fabricated report counts or financial values", () => {
  render(<ReportsCatalog {...props} />);
  expect(screen.getByRole("heading", { name: "Reportes y Analytics" })).toBeInTheDocument();
  expect(screen.getByText("On-books diario conectado")).toBeInTheDocument();
  for (const name of ["Operación", "Finanzas", "Cumplimiento", "Comercial"]) {
    expect(screen.getByRole("heading", { name })).toBeInTheDocument();
  }
  expect(screen.getAllByText("Pendiente de integración").length).toBeGreaterThan(0);
  expect(screen.queryByRole("button", { name: /Exportar|ADR|RevPAR/ })).not.toBeInTheDocument();
});

it("opens the real on-books view and returns to the catalog", () => {
  render(<ReportsCatalog {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir on-books de reservaciones" }));
  expect(screen.getByRole("heading", { name: "Detalle on-books" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Volver" }));
  expect(screen.getByRole("heading", { name: "Reportes y Analytics" })).toBeInTheDocument();
});
