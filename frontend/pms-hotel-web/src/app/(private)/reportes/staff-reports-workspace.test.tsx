import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { StaffReportsWorkspace } from "./staff-reports-workspace";

const mocks = vi.hoisted(() => ({ session: vi.fn(), scope: vi.fn(), dashboard: vi.fn() }));
vi.mock("@/modules/auth", () => ({ useStaffSession: mocks.session }));
vi.mock("@/modules/properties", () => ({ usePropertyScope: mocks.scope }));
vi.mock("@/modules/reports", () => ({ ReportsCatalog: (props: unknown) => {
  mocks.dashboard(props); return <p>Reporte autorizado</p>;
} }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockReturnValue({ id: "staff-1", permissions: ["COMMERCIAL_MANAGE"], memberships: [
    { propertyId: "property-1", name: "Hotel Uno", active: true },
  ] });
  mocks.scope.mockReturnValue({ ready: true, scope: { kind: "PROPERTY", propertyIds: ["property-1"] } });
});

it("does not mount a report without an authorized read permission", () => {
  mocks.session.mockReturnValue({ id: "staff-1", permissions: [], memberships: [] });
  render(<StaffReportsWorkspace />);
  expect(screen.getByRole("alert")).toHaveTextContent("no tiene permiso");
  expect(mocks.dashboard).not.toHaveBeenCalled();
});

it("allows Reception with RESERVATION_MANAGE to read its authorized property", () => {
  mocks.session.mockReturnValue({ id: "reception-1", permissions: ["RESERVATION_MANAGE"], memberships: [
    { propertyId: "property-1", name: "Hotel Uno", active: true },
  ] });
  render(<StaffReportsWorkspace />);
  expect(screen.getByText("Reporte autorizado")).toBeInTheDocument();
  expect(mocks.dashboard).toHaveBeenCalledWith(expect.objectContaining({
    sessionId: "reception-1", scope: { kind: "PROPERTY", propertyIds: ["property-1"] },
    canReadReservations: true, canReadHousekeeping: false,
  }));
});

it("allows Operations to see housekeeping without reservation reports", () => {
  mocks.session.mockReturnValue({ id: "operations-1", permissions: ["OPERATIONS_MANAGE"], memberships: [
    { propertyId: "property-1", name: "Hotel Uno", active: true },
  ] });
  render(<StaffReportsWorkspace />);
  expect(mocks.dashboard).toHaveBeenCalledWith(expect.objectContaining({
    canReadReservations: false, canReadHousekeeping: true,
  }));
});

it("uses the authorized property selection instead of the public environment", () => {
  vi.stubEnv("NEXT_PUBLIC_PROPERTY_ID", "outside-scope");
  render(<StaffReportsWorkspace />);
  expect(mocks.dashboard).toHaveBeenCalledWith(expect.objectContaining({
    sessionId: "staff-1", scope: { kind: "PROPERTY", propertyIds: ["property-1"] }, propertyNames: { "property-1": "Hotel Uno" },
  }));
  vi.unstubAllEnvs();
});

it("requires MULTI_PROPERTY_READ for the global selection", () => {
  mocks.scope.mockReturnValue({ ready: true, scope: { kind: "ALL_PROPERTIES", propertyIds: ["property-1"] } });
  render(<StaffReportsWorkspace />);
  expect(screen.getByRole("alert")).toHaveTextContent("todas las propiedades");
  expect(mocks.dashboard).not.toHaveBeenCalled();
});
