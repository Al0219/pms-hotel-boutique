import { describe, expect, it } from "vitest";

import { HttpStatusError } from "@/lib/http";

import { createPaymentGuaranteeDto } from "./payment.service";

describe("Payment Service", () => {
  it("creates payment guarantee successfully", async () => {
    const result = await createPaymentGuaranteeDto({
      payment_method: "CREDIT_CARD",
      card_holder_name: "Ana García",
      card_token: "tok_visa_valid",
      last4: "4242",
      card_brand: "Visa",
      amount: "500.00",
      currency: "USD",
    });

    expect(result.payment_id).toBeDefined();
    expect(result.status).toBe("AUTHORIZED");
    expect(result.amount).toBe("500.00");
    expect(result.currency).toBe("USD");
    expect(result.failure_reason).toBeNull();
  });

  it("handles declined card response cleanly", async () => {
    const result = await createPaymentGuaranteeDto({
      payment_method: "CREDIT_CARD",
      card_holder_name: "Ana García",
      card_token: "tok_declined",
      amount: "500.00",
      currency: "USD",
    });

    expect(result.status).toBe("DECLINED");
    expect(result.failure_reason).toContain("Fondos insuficientes");
  });

  it("throws HttpStatusError when server fails", async () => {
    await expect(
      createPaymentGuaranteeDto({
        payment_method: "CREDIT_CARD",
        card_token: "tok_error",
        amount: "500.00",
        currency: "USD",
      }),
    ).rejects.toThrow(HttpStatusError);
  });
});
