import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors";

import type { AuthorizePaymentRequest } from "../model/payment";
import { mapAuthorizePaymentRequestToDto } from "./payment.mapper";

describe("Payment Authorization Mappers", () => {
  const validAuthorizeRequest: AuthorizePaymentRequest = {
    folioId: "fol_guest_101",
    method: "CREDIT_CARD",
    amount: 350.5,
    currency: "USD",
    cardToken: "tok_visa_valid",
    cardHolderName: "Carlos Morales",
    last4: "4242",
    cardBrand: "Visa",
  };

  describe("mapAuthorizePaymentRequestToDto", () => {
    it("maps a valid domain authorization request to DTO", () => {
      const dto = mapAuthorizePaymentRequestToDto(validAuthorizeRequest);

      expect(dto.folio_id).toBe("fol_guest_101");
      expect(dto.method).toBe("CREDIT_CARD");
      expect(dto.amount).toBe("350.50");
      expect(dto.currency).toBe("USD");
      expect(dto.card_token).toBe("tok_visa_valid");
      expect(dto.last4).toBe("4242");
    });

    it("throws DomainMappingError when folioId is missing or amount is invalid", () => {
      expect(() =>
        mapAuthorizePaymentRequestToDto({
          ...validAuthorizeRequest,
          folioId: "",
        }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapAuthorizePaymentRequestToDto({
          ...validAuthorizeRequest,
          amount: 0,
        }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapAuthorizePaymentRequestToDto({
          ...validAuthorizeRequest,
          amount: -50,
        }),
      ).toThrow(DomainMappingError);
    });

    it("throws DomainMappingError when payment method is invalid or currency is missing", () => {
      expect(() =>
        mapAuthorizePaymentRequestToDto({
          ...validAuthorizeRequest,
          method: "BITCOIN" as unknown as "CREDIT_CARD",
        }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapAuthorizePaymentRequestToDto({
          ...validAuthorizeRequest,
          currency: "",
        }),
      ).toThrow(DomainMappingError);
    });
  });
});
