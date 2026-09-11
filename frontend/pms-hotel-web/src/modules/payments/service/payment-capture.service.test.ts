import { describe, expect, it } from "vitest";

import { HttpStatusError } from "@/lib/http";

import { capturePaymentDto } from "./payment.service";

describe("Payment Capture Service", () => {
  it("captures a payment successfully with full settlement (CAPTURED)", async () => {
    const payment = await capturePaymentDto("pay_101", {
      amount: "750.00",
      reason: "Checkout final capture",
    });

    expect(payment.payment_id).toBe("pay_101");
    expect(payment.status).toBe("CAPTURED");
    expect(payment.captured_amount).toBe("750.00");
  });

  it("captures a payment partially (PARTIALLY_CAPTURED)", async () => {
    const payment = await capturePaymentDto("pay_test_partial", {
      amount: "100.00",
      reason: "Partial room service settlement",
    });

    expect(payment.status).toBe("PARTIALLY_CAPTURED");
    expect(payment.captured_amount).toBe("100.00");
  });

  it("throws HttpStatusError on over-capture attempt", async () => {
    await expect(
      capturePaymentDto("pay_test_overcap", {
        amount: "9999.00",
        reason: "Over-capture attempt",
      }),
    ).rejects.toThrow(HttpStatusError);
  });
});
