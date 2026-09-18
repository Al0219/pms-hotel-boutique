import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ConciergeDetail } from "./concierge-detail";

afterEach(() => cleanup());

describe("ConciergeDetail", () => {
  it("presents the internal coordination without direct guest messaging", () => {
    render(<ConciergeDetail task={{
      id: "CT-001", propertyId: "GT-HB-01", title: "Traslado al aeropuerto", status: "IN_PROGRESS", receptionReference: "REC-01",
    }} />);

    expect(screen.getByRole("heading", { name: "Traslado al aeropuerto" })).toBeInTheDocument();
    expect(screen.getByText("REC-01")).toBeInTheDocument();
    expect(screen.getByText(/no envía mensajes directos al huésped/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
