import { describe, expect, it } from "vitest";

import { HttpStatusError } from "@/lib/http";

import { authorizePaymentDto } from "./payment.service";

describe("Payment Authorization Service", () => {
  it("authorizes a payment successfully via HTTP service", async () => {
    const payment = await authorizePaymentDto({
      folio_id: "fol_guest_101",
      method: "CREDIT_CARD",
      amount: "250.00",
      currency: "USD",
      card_token: "tok_visa_valid",
      last4: "4242",
      card_brand: "Visa",
    });

    expect(payment.payment_id).toBeDefined();
    expect(payment.status).toBe("AUTHORIZED");
    expect(payment.authorized_amount).toBe("250.00");
    expect(payment.provider_reference).toBeDefined();
    expect(payment.last4).toBe("4242");
  });

  it("handles declined authorization properly with DECLINED status", async () => {
    const payment = await authorizePaymentDto({
      folio_id: "fol_guest_101",
      method: "CREDIT_CARD",
      amount: "500.00",
      currency: "USD",
      card_token: "tok_declined",
    });

    expect(payment.status).toBe("DECLINED");
    expect(payment.failure_reason).toBeDefined();
  });

  it("throws HttpStatusError when gateway encounters an unrecoverable 500 error", async () => {
    await expect(
      authorizePaymentDto({
        folio_id: "fol_guest_101",
        method: "CREDIT_CARD",
        amount: "9999.00",
        currency: "USD",
        card_token: "tok_error",
      }),
    ).rejects.toThrow(HttpStatusError);
  });
});
