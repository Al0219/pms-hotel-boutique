import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors";

import type { FolioChargeDto, FolioDto, FolioPaymentEntryDto } from "../dtos/folio.dto";
import {
  mapFolioChargeDtoToDomain,
  mapFolioDtoToDomain,
  mapFolioPaymentEntryDtoToDomain,
} from "./folio.mapper";

describe("Folio Mapper", () => {
  const validChargeDto: FolioChargeDto = {
    charge_id: "chg_01",
    category: "ROOM_NIGHT",
    description: "Noche de habitación",
    amount: "200.00",
    currency: "USD",
    posted_at: "2026-10-01T15:00:00.000Z",
    posted_by: "system_audit",
    is_voided: false,
  };

  const validPaymentDto: FolioPaymentEntryDto = {
    payment_entry_id: "pe_01",
    payment_id: "pay_01",
    amount: "150.00",
    currency: "USD",
    method: "CREDIT_CARD",
    paid_at: "2026-10-01T16:00:00.000Z",
    reference: "ref_123",
  };

  const validFolioDto: FolioDto = {
    folio_id: "fol_01",
    folio_number: "FOL-2026-001",
    reservation_id: "res_01",
    stay_id: "stay_01",
    type: "GUEST",
    status: "OPEN",
    holder_name: "María Gómez",
    room_number: "Room 101",
    currency: "USD",
    total_charges: "200.00",
    total_payments: "150.00",
    balance: "50.00",
    charges: [validChargeDto],
    payments: [validPaymentDto],
    created_at: "2026-10-01T14:00:00.000Z",
  };

  describe("mapFolioChargeDtoToDomain", () => {
    it("maps a valid charge DTO to domain model", () => {
      const charge = mapFolioChargeDtoToDomain(validChargeDto);

      expect(charge.chargeId).toBe("chg_01");
      expect(charge.category).toBe("ROOM_NIGHT");
      expect(charge.amount).toBe(200);
      expect(charge.currency).toBe("USD");
      expect(charge.isVoided).toBe(false);
      expect(charge.postedAt.toISOString()).toBe("2026-10-01T15:00:00.000Z");
    });

    it("throws DomainMappingError when charge_id or category is invalid", () => {
      expect(() =>
        mapFolioChargeDtoToDomain({ ...validChargeDto, charge_id: "" }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapFolioChargeDtoToDomain({
          ...validChargeDto,
          category: "INVALID_CAT" as unknown as "ROOM_NIGHT",
        }),
      ).toThrow(DomainMappingError);
    });
  });

  describe("mapFolioPaymentEntryDtoToDomain", () => {
    it("maps payment entry DTO to domain", () => {
      const payment = mapFolioPaymentEntryDtoToDomain(validPaymentDto);

      expect(payment.paymentEntryId).toBe("pe_01");
      expect(payment.amount).toBe(150);
      expect(payment.method).toBe("CREDIT_CARD");
      expect(payment.reference).toBe("ref_123");
    });
  });

  describe("mapFolioDtoToDomain", () => {
    it("maps complete folio DTO and calculates balance accurately", () => {
      const folio = mapFolioDtoToDomain(validFolioDto);

      expect(folio.folioId).toBe("fol_01");
      expect(folio.folioNumber).toBe("FOL-2026-001");
      expect(folio.type).toBe("GUEST");
      expect(folio.status).toBe("OPEN");
      expect(folio.totalCharges).toBe(200);
      expect(folio.totalPayments).toBe(150);
      expect(folio.balance).toBe(50);
    });

    it("excludes voided charges from total charges and balance calculation", () => {
      const voidedCharge: FolioChargeDto = {
        charge_id: "chg_void",
        category: "MINIBAR",
        description: "Cargo erróneo minibar",
        amount: "50.00",
        currency: "USD",
        posted_at: "2026-10-01T17:00:00.000Z",
        posted_by: "staff",
        is_voided: true,
      };

      const folio = mapFolioDtoToDomain({
        ...validFolioDto,
        charges: [validChargeDto, voidedCharge],
      });

      // Total charges should still be 200 (ignores 50 voided)
      expect(folio.totalCharges).toBe(200);
      expect(folio.balance).toBe(50);
      expect(folio.charges).toHaveLength(2);
      expect(folio.charges[1].isVoided).toBe(true);
    });

    it("throws DomainMappingError when folio_id or type is missing", () => {
      expect(() =>
        mapFolioDtoToDomain({ ...validFolioDto, folio_id: "" }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapFolioDtoToDomain({
          ...validFolioDto,
          type: "INVALID_TYPE" as unknown as "GUEST",
        }),
      ).toThrow(DomainMappingError);
    });
  });
});
