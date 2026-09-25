import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors";
import { mapRefundPaymentRequestToDto } from "./payment.mapper";

describe("Payment Refund Mapper", () => {
  it("successfully maps a valid RefundPaymentRequest to DTO", () => {
    const domainRequest = {
      amount: 150.5,
      reason: "Huésped no utilizó servicio de spa reservado",
      currency: "usd",
    };

    const dto = mapRefundPaymentRequestToDto(domainRequest);

    expect(dto).toEqual({
      amount: "150.50",
      reason: "Huésped no utilizó servicio de spa reservado",
      currency: "USD",
    });
  });

  it("throws DomainMappingError when amount is missing, zero, or negative", () => {
    expect(() =>
      mapRefundPaymentRequestToDto({ amount: 0, reason: "Motivo válido" }),
    ).toThrow(DomainMappingError);

    expect(() =>
      mapRefundPaymentRequestToDto({ amount: -50, reason: "Motivo válido" }),
    ).toThrow(DomainMappingError);

    expect(() =>
      mapRefundPaymentRequestToDto({ amount: NaN, reason: "Motivo válido" }),
    ).toThrow(DomainMappingError);
  });

  it("throws DomainMappingError when reason is empty or only whitespace", () => {
    expect(() =>
      mapRefundPaymentRequestToDto({ amount: 100, reason: "" }),
    ).toThrow(DomainMappingError);

    expect(() =>
      mapRefundPaymentRequestToDto({ amount: 100, reason: "   " }),
    ).toThrow(DomainMappingError);
  });
});
