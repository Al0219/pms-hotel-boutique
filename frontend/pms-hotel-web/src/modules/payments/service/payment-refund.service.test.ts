import { describe, expect, it } from "vitest";

import { refundPaymentDto } from "./payment.service";

describe("Payment Refund Service", () => {
  it("processes a refund successfully and returns updated PaymentDto", async () => {
    const result = await refundPaymentDto("pay_102", {
      amount: "50.00",
      reason: "Descuento aplicado post-checkout",
    });

    expect(result).toBeDefined();
    expect(result.payment_id).toBe("pay_102");
    expect(result.status).toBe("PARTIALLY_REFUNDED");
    expect(Number(result.refunded_amount)).toBeGreaterThanOrEqual(50);
    expect(result.audit_trail?.some((a) => a.action === "REFUND")).toBe(true);
  });

  it("handles total refund changing status to REFUNDED", async () => {
    const result = await refundPaymentDto("pay_102", {
      amount: "150.00",
      reason: "Reembolso total de saldo restante",
    });

    expect(result).toBeDefined();
    expect(result.status).toBe("REFUNDED");
    expect(result.refunded_amount).toBe("200.00");
  });

  it("rejects refund when amount exceeds refundable remaining amount", async () => {
    await expect(
      refundPaymentDto("pay_102", {
        amount: "500.00",
        reason: "Intento de sobre-reembolso",
      }),
    ).rejects.toThrow();
  });

  it("throws error when API server returns error", async () => {
    await expect(
      refundPaymentDto("error_payment", {
        amount: "50.00",
        reason: "Servidor caído",
      }),
    ).rejects.toThrow();
  });
});
