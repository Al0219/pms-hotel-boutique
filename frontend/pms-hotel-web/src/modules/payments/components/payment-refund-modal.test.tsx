import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import type { Payment } from "../model/payment";
import { PaymentRefundModal } from "./payment-refund-modal";

const mockPayment: Payment = {
  paymentId: "pay_test_refund_101",
  folioId: "fol_guest_101",
  reservationId: "res_01",
  stayId: "stay_01",
  method: "CREDIT_CARD",
  status: "CAPTURED",
  currency: "USD",
  authorizedAmount: 400,
  capturedAmount: 400,
  refundedAmount: 100,
  remainingCapturableAmount: 0,
  remainingRefundableAmount: 300,
  providerReference: "tx_mock_cap",
  last4: "4242",
  cardBrand: "Visa",
  createdAt: new Date("2026-10-01T10:00:00.000Z"),
  updatedAt: new Date("2026-10-01T10:05:00.000Z"),
  failureReason: null,
  auditTrail: [],
};

describe("PaymentRefundModal Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders payment details, captured amount, and refundable balance", () => {
    render(
      <PaymentRefundModal
        payment={mockPayment}
        onRefund={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Reembolso de Pago")).toBeDefined();
    expect(screen.getByText(/pay_test_refund_101/)).toBeDefined();
    expect(screen.getByText("$400.00 USD")).toBeDefined();
    expect(screen.getByText("$300.00 USD")).toBeDefined();
    expect(screen.getByLabelText(/Monto a Reembolsar/i)).toBeDefined();
  });

  it("calls onRefund with valid amount and reason", async () => {
    const onRefundMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();

    const { container } = render(
      <PaymentRefundModal
        payment={mockPayment}
        onRefund={onRefundMock}
        onClose={onCloseMock}
      />,
    );

    const amountInput = screen.getByLabelText(/Monto a Reembolsar/i) as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: "150.00" } });

    const reasonInput = screen.getByPlaceholderText(/Inconformidad con el servicio/i);
    fireEvent.change(reasonInput, { target: { value: "Reembolso acordado con el huésped" } });

    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(onRefundMock).toHaveBeenCalledWith("pay_test_refund_101", {
      amount: 150,
      reason: "Reembolso acordado con el huésped",
      currency: "USD",
    });
  });

  it("shows error when reason is empty", async () => {
    const onRefundMock = vi.fn();
    const onCloseMock = vi.fn();

    const { container } = render(
      <PaymentRefundModal
        payment={mockPayment}
        onRefund={onRefundMock}
        onClose={onCloseMock}
      />,
    );

    const reasonInput = screen.getByPlaceholderText(/Inconformidad con el servicio/i);
    fireEvent.change(reasonInput, { target: { value: "" } });

    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(screen.getByText(/Debe especificar un motivo para el reembolso/i)).toBeDefined();
    expect(onRefundMock).not.toHaveBeenCalled();
  });

  it("shows error when refund amount exceeds refundable balance", async () => {
    const onRefundMock = vi.fn();
    const onCloseMock = vi.fn();

    const { container } = render(
      <PaymentRefundModal
        payment={mockPayment}
        onRefund={onRefundMock}
        onClose={onCloseMock}
      />,
    );

    const amountInput = screen.getByLabelText(/Monto a Reembolsar/i);
    fireEvent.change(amountInput, { target: { value: "350.00" } });

    const reasonInput = screen.getByPlaceholderText(/Inconformidad con el servicio/i);
    fireEvent.change(reasonInput, { target: { value: "Intento inválido" } });

    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(screen.getByText(/El monto no puede exceder el saldo reembolsable/i)).toBeDefined();
    expect(onRefundMock).not.toHaveBeenCalled();
  });

  it("closes modal on Cancel button click", () => {
    const onCloseMock = vi.fn();

    render(
      <PaymentRefundModal
        payment={mockPayment}
        onRefund={vi.fn()}
        onClose={onCloseMock}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
