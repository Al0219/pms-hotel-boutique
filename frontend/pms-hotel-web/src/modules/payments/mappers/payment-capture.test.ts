import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors";

import type { CapturePaymentRequest } from "../model/payment";
import { mapCapturePaymentRequestToDto } from "./payment.mapper";

describe("Payment Capture Mappers", () => {
  const validCaptureRequest: CapturePaymentRequest = {
    amount: 150.75,
    currency: "USD",
    reason: "Final settlement checkout",
  };

  describe("mapCapturePaymentRequestToDto", () => {
    it("maps a valid domain capture request to DTO", () => {
      const dto = mapCapturePaymentRequestToDto(validCaptureRequest);

      expect(dto.amount).toBe("150.75");
      expect(dto.currency).toBe("USD");
      expect(dto.reason).toBe("Final settlement checkout");
    });

    it("throws DomainMappingError when amount is zero or negative", () => {
      expect(() =>
        mapCapturePaymentRequestToDto({
          amount: 0,
        }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapCapturePaymentRequestToDto({
          amount: -10,
        }),
      ).toThrow(DomainMappingError);
    });
  });
});
