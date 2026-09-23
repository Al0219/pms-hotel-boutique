import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PaymentVoidModal } from "./payment-void-modal";
import type { Payment } from "../model/payment";

describe("PaymentVoidModal Component", () => {
  afterEach(() => {
    cleanup();
  });

  const mockAuthorizedPayment: Payment = {
    paymentId: "pay_test_void_01",
    folioId: "fol_guest_101",
    reservationId: "res_01",
    stayId: "stay_01",
    method: "CREDIT_CARD",
    status: "AUTHORIZED",
    currency: "USD",
    authorizedAmount: 750,
    capturedAmount: 0,
    refundedAmount: 0,
    remainingCapturableAmount: 750,
    remainingRefundableAmount: 0,
    providerReference: "tx_mock_auth",
    last4: "4242",
    cardBrand: "Visa",
    createdAt: new Date("2026-10-01T10:00:00Z"),
    updatedAt: new Date("2026-10-01T10:00:00Z"),
    failureReason: null,
    auditTrail: [],
  };

  it("renders void modal with irreversibility warning and transaction info", () => {
    render(
      <PaymentVoidModal
        payment={mockAuthorizedPayment}
        onVoid={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Anulación de Pago (Void)")).toBeInTheDocument();
    expect(screen.getByText("pay_test_void_01")).toBeInTheDocument();
    expect(screen.getByText(/Advertencia/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo de la Anulación/i)).toBeInTheDocument();
  });

  it("calls onVoid when submitting valid reason", async () => {
    const onVoidMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();

    render(
      <PaymentVoidModal
        payment={mockAuthorizedPayment}
        onVoid={onVoidMock}
        onClose={onCloseMock}
      />,
    );

    const reasonInput = screen.getByLabelText(/Motivo de la Anulación/i);
    fireEvent.change(reasonInput, { target: { value: "Cancelación definitiva por el huésped" } });
    const form = reasonInput.closest("form")!;
    fireEvent.submit(form);

    expect(onVoidMock).toHaveBeenCalledWith("pay_test_void_01", {
      reason: "Cancelación definitiva por el huésped",
    });
  });

  it("calls onClose when clicking Cancelar button", () => {
    const onCloseMock = vi.fn();

    render(
      <PaymentVoidModal
        payment={mockAuthorizedPayment}
        onVoid={vi.fn()}
        onClose={onCloseMock}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
