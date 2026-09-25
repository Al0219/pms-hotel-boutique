import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PrivateLayout from "./layout";

describe("PrivateLayout", () => {
  it("renders staff navigation with links to every mounted module", () => {
    render(
      <PrivateLayout>
        <p>Contenido Staff</p>
      </PrivateLayout>,
    );

    const nav = screen.getByRole("navigation", { name: "Módulos Staff" });

    for (const [label, href] of [
      ["Panel", "/dashboard"],
      ["Reservas", "/reservas"],
      ["Habitaciones", "/habitaciones"],
      ["Housekeeping", "/housekeeping"],
      ["Mantenimiento", "/mantenimiento"],
      ["Empresas", "/empresas"],
      ["Agencias", "/agencias"],
      ["Grupos", "/grupos"],
      ["Integraciones", "/integraciones"],
      ["Reportes", "/reportes"],
    ] as const) {
      expect(within(nav).getByRole("link", { name: label })).toHaveAttribute("href", href);
    }

    expect(screen.getByText("Contenido Staff")).toBeInTheDocument();
  });

  it("exposes no link to unmounted staff routes", () => {
    render(
      <PrivateLayout>
        <p>Contenido Staff</p>
      </PrivateLayout>,
    );

    const nav = screen.getByRole("navigation", { name: "Módulos Staff" });

    expect(within(nav).queryByRole("link", { name: "Calendario" })).not.toBeInTheDocument();
  });
});
