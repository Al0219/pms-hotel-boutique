import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FolioTransferModal } from "./folio-transfer-modal";
import type { FolioCharge } from "../model/folio";

describe("FolioTransferModal Component", () => {
  const mockCharge: FolioCharge = {
    chargeId: "chg_02",
    description: "Servicio Room Service Cena",
    category: "RESTAURANT",
    amount: 85.5,
    currency: "USD",
    postedAt: new Date("2026-10-01T20:00:00Z"),
    postedBy: "staff_roomservice",
    isVoided: false,
  };

  it("renders charge information and transfer fields", () => {
    render(
      <FolioTransferModal
        charge={mockCharge}
        onTransfer={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Transferir Cargo a Otro Folio")).toBeInTheDocument();
    expect(screen.getByText("Servicio Room Service Cena")).toBeInTheDocument();
    expect(screen.getByText("$85.50 USD")).toBeInTheDocument();
  });

  it("calls onTransfer with target folio and reason when confirmed", () => {
    const handleTransfer = vi.fn();
    render(
      <FolioTransferModal
        charge={mockCharge}
        onTransfer={handleTransfer}
        onClose={vi.fn()}
      />
    );

    const submitBtn = screen.getByText("Confirmar Transferencia");
    fireEvent.click(submitBtn);

    expect(handleTransfer).toHaveBeenCalledTimes(1);
    expect(handleTransfer).toHaveBeenCalledWith(
      "fol_company_202",
      "Acuerdo de cobertura corporativa de estancia"
    );
  });

  it("calls onClose when Cancel button is clicked", () => {
    const handleClose = vi.fn();
    render(
      <FolioTransferModal
        charge={mockCharge}
        onTransfer={vi.fn()}
        onClose={handleClose}
      />
    );

    const cancelBtn = screen.getByText("Cancelar");
    fireEvent.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
