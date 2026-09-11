import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { PaymentListCard } from "./payment-list-card";
import type { Payment } from "../model/payment";

describe("PaymentListCard Component", () => {
  const mockPayments: Payment[] = [
    {
      paymentId: "pay_test_01",
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
      providerReference: "tx_mock_auth_101",
      last4: "4242",
      cardBrand: "Visa",
      createdAt: new Date("2026-10-01T10:00:00Z"),
      updatedAt: new Date("2026-10-01T10:00:00Z"),
      failureReason: null,
      auditTrail: [
        {
          auditId: "aud_01",
          action: "AUTHORIZE",
          amount: 750,
          currency: "USD",
          performedBy: "system_gateway",
          performedAt: new Date("2026-10-01T10:00:00Z"),
          providerReference: "tx_mock_auth_101",
        },
      ],
    },
  ];

  it("renders payment list card with transaction details and status badge", () => {
    render(<PaymentListCard payments={mockPayments} />);

    expect(screen.getByText("Historial de Pagos y Transacciones")).toBeInTheDocument();
    expect(screen.getByText("pay_test_01")).toBeInTheDocument();
    expect(screen.getByText("AUTHORIZED")).toBeInTheDocument();
    expect(screen.getByText("$750.00 USD")).toBeInTheDocument();
    expect(screen.getByText(/4242/)).toBeInTheDocument();
  });

  it("renders empty state message when no payments provided", () => {
    render(<PaymentListCard payments={[]} />);

    expect(screen.getByText("No hay transacciones de pago registradas.")).toBeInTheDocument();
  });
});
