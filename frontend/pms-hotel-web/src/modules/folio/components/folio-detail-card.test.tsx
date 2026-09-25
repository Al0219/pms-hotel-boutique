import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Folio } from "../model/folio";
import { FolioDetailCard } from "./folio-detail-card";

describe("FolioDetailCard Component", () => {
  const mockFolio: Folio = {
    folioId: "fol_test_01",
    folioNumber: "FOL-2026-999",
    reservationId: "res_01",
    stayId: "stay_01",
    type: "GUEST",
    status: "OPEN",
    holderName: "Roberto Gómez",
    roomNumber: "Suite 301",
    currency: "USD",
    totalCharges: 600,
    totalPayments: 400,
    balance: 200,
    charges: [
      {
        chargeId: "chg_1",
        category: "ROOM_NIGHT",
        description: "Estancia 2 noches",
        amount: 500,
        currency: "USD",
        postedAt: new Date("2026-10-01"),
        postedBy: "audit",
        isVoided: false,
      },
      {
        chargeId: "chg_2",
        category: "RESTAURANT",
        description: "Almuerzo",
        amount: 100,
        currency: "USD",
        postedAt: new Date("2026-10-02"),
        postedBy: "pos",
        isVoided: false,
      },
    ],
    payments: [
      {
        paymentEntryId: "pe_1",
        paymentId: "pay_1",
        amount: 400,
        currency: "USD",
        method: "CREDIT_CARD",
        paidAt: new Date("2026-10-01"),
        reference: "ref_stripe_1",
      },
    ],
    createdAt: new Date("2026-10-01"),
  };

  it("renders folio summary, balance and badges accurately", () => {
    render(<FolioDetailCard folio={mockFolio} />);

    expect(screen.getByText(/Folio FOL-2026-999/)).toBeInTheDocument();
    expect(screen.getByText("Roberto Gómez")).toBeInTheDocument();
    expect(screen.getByText("Suite 301")).toBeInTheDocument();
    expect(screen.getByText("$200.00 USD")).toBeInTheDocument();
    expect(screen.getByText("Estancia 2 noches")).toBeInTheDocument();
    expect(screen.getByText("-$400.00 USD")).toBeInTheDocument();
  });
});
