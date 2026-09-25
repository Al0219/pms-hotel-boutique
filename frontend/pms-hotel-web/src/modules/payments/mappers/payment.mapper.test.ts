import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors";

import type { PaymentGuaranteeResponseDto } from "../dtos/payment.dto";
import type { PaymentGuaranteeRequest } from "../model/payment";
import {
  mapPaymentGuaranteeDtoToDomain,
  mapPaymentGuaranteeRequestToDto,
} from "./payment.mapper";

describe("Payment Mapper", () => {
  const validResponseDto: PaymentGuaranteeResponseDto = {
    payment_id: "pay_123",
    status: "AUTHORIZED",
    amount: "750.00",
    currency: "USD",
    provider_reference: "ref_tok_abc",
    last4: "4242",
    card_brand: "Visa",
    created_at: "2026-10-01T12:00:00.000Z",
    failure_reason: null,
  };

  const validRequest: PaymentGuaranteeRequest = {
    paymentMethod: "CREDIT_CARD",
    cardHolderName: "Juan Pérez",
    cardToken: "tok_visa_valid",
    last4: "4242",
    cardBrand: "Visa",
    expirationMonth: 12,
    expirationYear: 2028,
    amount: 750,
    currency: "USD",
    reservationReference: "res_draft_999",
  };

  describe("mapPaymentGuaranteeDtoToDomain", () => {
    it("maps a valid payment guarantee DTO to domain model", () => {
      const result = mapPaymentGuaranteeDtoToDomain(validResponseDto);

      expect(result.paymentId).toBe("pay_123");
      expect(result.status).toBe("AUTHORIZED");
      expect(result.amount).toBe(750);
      expect(result.currency).toBe("USD");
      expect(result.providerReference).toBe("ref_tok_abc");
      expect(result.last4).toBe("4242");
      expect(result.cardBrand).toBe("Visa");
      expect(result.createdAt.toISOString()).toBe("2026-10-01T12:00:00.000Z");
      expect(result.failureReason).toBeNull();
    });

    it("throws DomainMappingError when payment_id is missing or empty", () => {
      expect(() =>
        mapPaymentGuaranteeDtoToDomain({ ...validResponseDto, payment_id: "" }),
      ).toThrow(DomainMappingError);
    });

    it("throws DomainMappingError when status is invalid", () => {
      expect(() =>
        mapPaymentGuaranteeDtoToDomain({
          ...validResponseDto,
          status: "UNKNOWN_STATUS" as unknown as "AUTHORIZED",
        }),
      ).toThrow(DomainMappingError);
    });

    it("throws DomainMappingError when amount is not a valid number", () => {
      expect(() =>
        mapPaymentGuaranteeDtoToDomain({ ...validResponseDto, amount: "not_a_number" }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapPaymentGuaranteeDtoToDomain({ ...validResponseDto, amount: "-10.00" }),
      ).toThrow(DomainMappingError);
    });

    it("throws DomainMappingError when created_at is an invalid date string", () => {
      expect(() =>
        mapPaymentGuaranteeDtoToDomain({ ...validResponseDto, created_at: "invalid_date" }),
      ).toThrow(DomainMappingError);
    });
  });

  describe("mapPaymentGuaranteeRequestToDto", () => {
    it("maps a valid domain request to DTO without exposing raw cards", () => {
      const dto = mapPaymentGuaranteeRequestToDto(validRequest);

      expect(dto.payment_method).toBe("CREDIT_CARD");
      expect(dto.card_holder_name).toBe("Juan Pérez");
      expect(dto.card_token).toBe("tok_visa_valid");
      expect(dto.last4).toBe("4242");
      expect(dto.amount).toBe("750.00");
      expect(dto.currency).toBe("USD");
      expect(dto.reservation_reference).toBe("res_draft_999");
    });

    it("throws DomainMappingError when payment method is invalid or amount <= 0", () => {
      expect(() =>
        mapPaymentGuaranteeRequestToDto({
          ...validRequest,
          paymentMethod: "CRYPTO" as unknown as "CREDIT_CARD",
        }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapPaymentGuaranteeRequestToDto({ ...validRequest, amount: 0 }),
      ).toThrow(DomainMappingError);
    });
  });
});
