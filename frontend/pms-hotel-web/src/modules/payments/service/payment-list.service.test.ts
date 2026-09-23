import { describe, expect, it } from "vitest";

import { HttpStatusError } from "@/lib/http";

import { fetchPaymentByIdDto, fetchPaymentsDto } from "./payment.service";

describe("Payment List & Detail Service", () => {
  it("fetches payments list successfully via HTTP service", async () => {
    const result = await fetchPaymentsDto({ folio_id: "fol_guest_101" });

    expect(result.payments).toBeDefined();
    expect(result.payments.length).toBeGreaterThan(0);
    expect(result.total_count).toBeGreaterThan(0);
  });

  it("fetches payment detail by ID successfully", async () => {
    const payment = await fetchPaymentByIdDto("pay_101");

    expect(payment.payment_id).toBe("pay_101");
    expect(payment.folio_id).toBe("fol_guest_101");
    expect(payment.status).toBe("AUTHORIZED");
  });

  it("throws HttpStatusError when payment is not found or error occurs", async () => {
    await expect(fetchPaymentByIdDto("error_payment")).rejects.toThrow(HttpStatusError);
  });
});
