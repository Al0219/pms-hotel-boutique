import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors";

import type { PaymentDto, PaymentListResponseDto } from "../dtos/payment.dto";
import {
  mapPaymentAuditEntryDtoToDomain,
  mapPaymentDtoToDomain,
  mapPaymentListResponseDtoToDomain,
} from "./payment.mapper";

describe("Payment Domain Mappers", () => {
  const validPaymentDto: PaymentDto = {
    payment_id: "pay_test_01",
    folio_id: "fol_test_101",
    reservation_id: "res_test_1",
    stay_id: "stay_test_1",
    method: "CREDIT_CARD",
    status: "AUTHORIZED",
    currency: "USD",
    authorized_amount: "500.00",
    captured_amount: "200.00",
    refunded_amount: "50.00",
    provider_reference: "tx_mock_123",
    last4: "4242",
    card_brand: "Visa",
    created_at: "2026-10-01T10:00:00.000Z",
    updated_at: "2026-10-01T11:00:00.000Z",
    failure_reason: null,
    audit_trail: [
      {
        audit_id: "aud_01",
        action: "AUTHORIZE",
        amount: "500.00",
        currency: "USD",
        performed_by: "system",
        performed_at: "2026-10-01T10:00:00.000Z",
      },
    ],
  };

  describe("mapPaymentDtoToDomain", () => {
    it("maps a valid payment DTO to domain model with calculated remaining amounts", () => {
      const payment = mapPaymentDtoToDomain(validPaymentDto);

      expect(payment.paymentId).toBe("pay_test_01");
      expect(payment.folioId).toBe("fol_test_101");
      expect(payment.method).toBe("CREDIT_CARD");
      expect(payment.status).toBe("AUTHORIZED");
      expect(payment.authorizedAmount).toBe(500);
      expect(payment.capturedAmount).toBe(200);
      expect(payment.refundedAmount).toBe(50);
      expect(payment.remainingCapturableAmount).toBe(300); // 500 - 200
      expect(payment.remainingRefundableAmount).toBe(150); // 200 - 50
      expect(payment.last4).toBe("4242");
      expect(payment.cardBrand).toBe("Visa");
      expect(payment.auditTrail).toHaveLength(1);
    });

    it("throws DomainMappingError when payment_id or folio_id is missing", () => {
      expect(() =>
        mapPaymentDtoToDomain({ ...validPaymentDto, payment_id: "" }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapPaymentDtoToDomain({ ...validPaymentDto, folio_id: "   " }),
      ).toThrow(DomainMappingError);
    });

    it("throws DomainMappingError for invalid status or invalid method", () => {
      expect(() =>
        mapPaymentDtoToDomain({ ...validPaymentDto, status: "INVALID_STATUS" as unknown as "AUTHORIZED" }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapPaymentDtoToDomain({ ...validPaymentDto, method: "BITCOIN" as unknown as "CREDIT_CARD" }),
      ).toThrow(DomainMappingError);
    });
  });

  describe("mapPaymentAuditEntryDtoToDomain", () => {
    it("maps an audit entry DTO to domain", () => {
      const audit = mapPaymentAuditEntryDtoToDomain({
        audit_id: "aud_99",
        action: "CAPTURE",
        amount: "100.00",
        currency: "USD",
        performed_by: "agent_smith",
        performed_at: "2026-10-01T15:00:00.000Z",
        reason: "Pre-auth settlement",
      });

      expect(audit.auditId).toBe("aud_99");
      expect(audit.action).toBe("CAPTURE");
      expect(audit.amount).toBe(100);
      expect(audit.performedBy).toBe("agent_smith");
      expect(audit.reason).toBe("Pre-auth settlement");
    });
  });

  describe("mapPaymentListResponseDtoToDomain", () => {
    it("maps list response DTO with multiple payments to domain", () => {
      const listDto: PaymentListResponseDto = {
        payments: [validPaymentDto],
        total_count: 1,
      };

      const result = mapPaymentListResponseDtoToDomain(listDto);
      expect(result.payments).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.payments[0].paymentId).toBe("pay_test_01");
    });
  });
});
