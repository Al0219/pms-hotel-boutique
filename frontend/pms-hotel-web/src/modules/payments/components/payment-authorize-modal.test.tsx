import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PaymentAuthorizeModal } from "./payment-authorize-modal";

describe("PaymentAuthorizeModal Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders modal with default values without exposing PAN/CVV fields", () => {
    render(<PaymentAuthorizeModal onAuthorize={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText("Nueva Autorización de Pago")).toBeInTheDocument();
    expect(screen.getByLabelText(/Folio Destino/i)).toHaveValue("fol_guest_101");
    expect(screen.getByLabelText(/Monto/i)).toHaveValue(250);
    expect(screen.getByRole("button", { name: "Autorizar Pago" })).toBeInTheDocument();

    // Verify 0 PAN / CVV inputs
    expect(screen.queryByLabelText(/CVV/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/PAN/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/1234/)).not.toBeInTheDocument();
  });

  it("calls onAuthorize when submitting valid form", async () => {
    const onAuthorizeMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();

    render(<PaymentAuthorizeModal onAuthorize={onAuthorizeMock} onClose={onCloseMock} />);

    fireEvent.change(screen.getByLabelText(/Monto/i), { target: { value: "300" } });
    fireEvent.click(screen.getByRole("button", { name: "Autorizar Pago" }));

    expect(onAuthorizeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        folioId: "fol_guest_101",
        amount: 300,
        currency: "USD",
        method: "CREDIT_CARD",
      }),
    );
  });

  it("calls onClose when clicking Cancelar button", () => {
    const onCloseMock = vi.fn();
    render(<PaymentAuthorizeModal onAuthorize={vi.fn()} onClose={onCloseMock} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
