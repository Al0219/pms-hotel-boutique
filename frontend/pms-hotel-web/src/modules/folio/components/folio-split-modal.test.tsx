import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FolioSplitModal } from "./folio-split-modal";
import type { FolioCharge } from "../model/folio";

describe("FolioSplitModal Component", () => {
  const mockCharge: FolioCharge = {
    chargeId: "chg_01",
    folioId: "fol_guest_101",
    description: "Noche Deluxe Suite",
    category: "ROOM",
    amount: 200,
    currency: "USD",
    postedAt: new Date("2026-10-01T10:00:00Z"),
    status: "POSTED",
  };

  it("renders charge description and amount", () => {
    render(
      <FolioSplitModal
        charge={mockCharge}
        onSplit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Dividir Cargo (Split)")).toBeInTheDocument();
    expect(screen.getByText("Noche Deluxe Suite")).toBeInTheDocument();
    expect(screen.getByText("$200.00 USD")).toBeInTheDocument();
  });

  it("calls onSplit with correct portions when submitted", () => {
    const handleSplit = vi.fn();
    render(
      <FolioSplitModal
        charge={mockCharge}
        onSplit={handleSplit}
        onClose={vi.fn()}
      />
    );

    const submitBtn = screen.getByText("Confirmar División");
    fireEvent.click(submitBtn);

    expect(handleSplit).toHaveBeenCalledTimes(1);
    const portions = handleSplit.mock.calls[0][0];
    expect(portions).toHaveLength(2);
    expect(portions[0].amount).toBe(100);
    expect(portions[1].amount).toBe(100);
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    render(
      <FolioSplitModal
        charge={mockCharge}
        onSplit={vi.fn()}
        onClose={handleClose}
      />
    );

    const cancelBtn = screen.getByText("Cancelar");
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalled();
  });
});
