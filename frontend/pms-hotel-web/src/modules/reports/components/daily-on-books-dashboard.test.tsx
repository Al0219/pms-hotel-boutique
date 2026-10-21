import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { DailyOnBooksDashboard } from "./daily-on-books-dashboard";

const mocks = vi.hoisted(() => ({ report: vi.fn() }));
vi.mock("../hooks/use-daily-on-books", () => ({ useDailyOnBooks: mocks.report }));
const props = { sessionId: "staff-1", scope: { kind: "PROPERTY" as const, propertyIds: ["property-1"] as [string] },
  propertyNames: { "property-1": "Hotel Uno" } };

beforeEach(() => { mocks.report.mockReset(); mocks.report.mockReturnValue({ isPending: true, fetchStatus: "idle", isError: false,
  isSuccess: false, refetch: vi.fn() }); });

it("does not request data until an explicit valid date range is submitted", () => {
  render(<DailyOnBooksDashboard {...props} />);
  expect(mocks.report).toHaveBeenCalledWith("staff-1", props.scope, null, null);
  fireEvent.change(screen.getByLabelText("Desde (noche local)"), { target: { value: "2035-01-01" } });
  fireEvent.change(screen.getByLabelText("Hasta (noche local)"), { target: { value: "2035-01-03" } });
  fireEvent.click(screen.getByRole("button", { name: "Consultar reporte" }));
  expect(mocks.report).toHaveBeenLastCalledWith("staff-1", props.scope, "2035-01-01", "2035-01-03");
});

it("labels current on-books and displays Backend values without revenue metrics", () => {
  mocks.report.mockReturnValue({ isPending: false, fetchStatus: "idle", isError: false, isSuccess: true,
    data: { calculatedAt: "2035-01-01T12:00:00Z", rows: [{ propertyId: "property-1", stayDate: "2035-01-01",
      timezone: "America/Guatemala", currency: "GTQ", physicalRooms: 3, outOfOrderRooms: 1,
      availableRooms: 2, onBooksRooms: 2, onBooksPercent: 100, unavailableReason: null }] }, refetch: vi.fn() });
  render(<DailyOnBooksDashboard {...props} />);
  expect(screen.getByRole("heading", { name: "Reporte · Reservaciones on-books por noche" })).toBeInTheDocument();
  expect(screen.getByRole("row", { name: /Hotel Uno.*2035-01-01.*100.00%/ })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Resumen para 2035-01-01" })).toHaveTextContent("2");
  expect(screen.queryByText(/ADR|RevPAR|Ingresos/)).not.toBeInTheDocument();
});
