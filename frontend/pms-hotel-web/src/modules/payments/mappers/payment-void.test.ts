import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors";

import type { VoidPaymentRequest } from "../model/payment";
import { mapVoidPaymentRequestToDto } from "./payment.mapper";

describe("Payment Void Mappers", () => {
  const validVoidRequest: VoidPaymentRequest = {
    reason: "Client canceled pre-booking",
  };

  describe("mapVoidPaymentRequestToDto", () => {
    it("maps a valid domain void request to DTO", () => {
      const dto = mapVoidPaymentRequestToDto(validVoidRequest);

      expect(dto.reason).toBe("Client canceled pre-booking");
    });

    it("throws DomainMappingError when reason is empty or only whitespace", () => {
      expect(() =>
        mapVoidPaymentRequestToDto({
          reason: "",
        }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapVoidPaymentRequestToDto({
          reason: "   ",
        }),
      ).toThrow(DomainMappingError);
    });
  });
});
