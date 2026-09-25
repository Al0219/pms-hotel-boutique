import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RoomCleaningDetail } from "./room-cleaning-detail";

afterEach(() => cleanup());

describe("RoomCleaningDetail", () => {
  it("presents the base cleaning status through the shared StatusBadge", () => {
    render(<RoomCleaningDetail room={{
      id: "RM-101", propertyId: "GT-HB-01", roomLabel: "Habitación 101", status: "DIRTY",
    }} />);

    expect(screen.getByRole("heading", { name: "Habitación 101" })).toBeInTheDocument();
    expect(screen.getByText("Sucia")).toBeInTheDocument();
    expect(screen.getByText(/no sustituyen este estado/i)).toBeInTheDocument();
  });
});
