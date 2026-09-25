import { describe, expect, it } from "vitest";

import { HttpStatusError } from "@/lib/http";

import { voidPaymentDto } from "./payment.service";

describe("Payment Void Service", () => {
  it("voids an authorized payment successfully (VOIDED)", async () => {
    const payment = await voidPaymentDto("pay_test_void_ok", {
      reason: "Reservation cancellation",
    });

    expect(payment.payment_id).toBe("pay_test_void_ok");
    expect(payment.status).toBe("VOIDED");
    expect(payment.audit_trail).toBeDefined();
    expect(payment.audit_trail?.some((a) => a.action === "VOID")).toBe(true);
  });

  it("throws HttpStatusError when server or gateway fails", async () => {
    await expect(
      voidPaymentDto("pay_test_void_error", {
        reason: "error_trigger",
      }),
    ).rejects.toThrow(HttpStatusError);
  });
});
