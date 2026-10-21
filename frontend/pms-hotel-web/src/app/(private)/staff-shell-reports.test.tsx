import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { StaffShell } from "./staff-shell";

const mocks = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("@/modules/auth", () => ({ useStaffSession: mocks.session, StaffLogout: () => <button>Cerrar sesión</button> }));
vi.mock("@/modules/properties", () => ({ PropertySwitcher: () => <span>Propiedad</span> }));

beforeEach(() => mocks.session.mockReturnValue({ roleId: "RECEPCION", roleName: "Recepción", userName: "recepcion",
  permissions: ["RESERVATION_MANAGE"] }));

it("shows Reportes to Reception with reservation read permission", () => {
  render(<StaffShell><p>Panel</p></StaffShell>);
  expect(screen.getByRole("link", { name: "Reportes" })).toHaveAttribute("href", "/reportes");
});

it("hides Reportes without either read permission", () => {
  mocks.session.mockReturnValue({ roleId: "RECEPCION", roleName: "Recepción", userName: "recepcion", permissions: [] });
  render(<StaffShell><p>Panel</p></StaffShell>);
  expect(screen.queryByRole("link", { name: "Reportes" })).not.toBeInTheDocument();
});
