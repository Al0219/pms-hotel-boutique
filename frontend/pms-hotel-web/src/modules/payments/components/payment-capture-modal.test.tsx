import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PaymentCaptureModal } from "./payment-capture-modal";
import type { Payment } from "../model/payment";

describe("PaymentCaptureModal Component", () => {
  afterEach(() => {
    cleanup();
  });

  const mockAuthorizedPayment: Payment = {
    paymentId: "pay_test_cap_01",
    folioId: "fol_guest_101",
    reservationId: "res_01",
    stayId: "stay_01",
    method: "CREDIT_CARD",
    status: "AUTHORIZED",
    currency: "USD",
    authorizedAmount: 500,
    capturedAmount: 100,
    refundedAmount: 0,
    remainingCapturableAmount: 400,
    remainingRefundableAmount: 100,
    providerReference: "tx_mock_auth",
    last4: "4242",
    cardBrand: "Visa",
    createdAt: new Date("2026-10-01T10:00:00Z"),
    updatedAt: new Date("2026-10-01T10:00:00Z"),
    failureReason: null,
    auditTrail: [],
  };

  it("renders capture modal with authorized summary and remaining capturable default", () => {
    render(
      <PaymentCaptureModal
        payment={mockAuthorizedPayment}
        onCapture={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Captura / Liquidación de Pago")).toBeInTheDocument();
    expect(screen.getByText("pay_test_cap_01")).toBeInTheDocument();
    expect(screen.getByText("$500.00")).toBeInTheDocument();
    expect(screen.getByText("$400.00")).toBeInTheDocument();
    expect(screen.getByLabelText(/Monto a Capturar/i)).toHaveValue(400);
  });

  it("calls onCapture when submitting valid amount", async () => {
    const onCaptureMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();

    render(
      <PaymentCaptureModal
        payment={mockAuthorizedPayment}
        onCapture={onCaptureMock}
        onClose={onCloseMock}
      />,
    );

    const amountInput = screen.getByLabelText(/Monto a Capturar/i);
    fireEvent.change(amountInput, { target: { value: "250" } });
    const form = amountInput.closest("form")!;
    fireEvent.submit(form);

    expect(onCaptureMock).toHaveBeenCalledWith(
      "pay_test_cap_01",
      expect.objectContaining({
        amount: 250,
        currency: "USD",
      }),
    );
  });

  it("shows error when trying to over-capture amount exceeding remainingCapturableAmount", () => {
    const onCaptureMock = vi.fn();

    render(
      <PaymentCaptureModal
        payment={mockAuthorizedPayment}
        onCapture={onCaptureMock}
        onClose={vi.fn()}
      />,
    );

    const amountInput = screen.getByLabelText(/Monto a Capturar/i);
    fireEvent.change(amountInput, { target: { value: "600" } });
    const form = amountInput.closest("form")!;
    fireEvent.submit(form);

    expect(screen.getByRole("alert")).toHaveTextContent(/no puede exceder el monto remanente/i);
    expect(onCaptureMock).not.toHaveBeenCalled();
  });
});
