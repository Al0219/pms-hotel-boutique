import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors";

import type { ChargeRoutingRuleDto, SplitChargeResultDto } from "../dtos/folio.dto";
import type { SplitChargeRequest } from "../model/folio";
import {
  mapChargeRoutingRuleDtoToDomain,
  mapSplitChargeRequestToDto,
  mapSplitChargeResultDtoToDomain,
} from "./folio.mapper";

describe("Folio Routing & Split Mappers", () => {
  const validRoutingDto: ChargeRoutingRuleDto = {
    rule_id: "rule_101",
    source_folio_id: "fol_guest_1",
    target_folio_id: "fol_comp_1",
    category: "ROOM_NIGHT",
    percentage: 100,
    created_at: "2026-10-01T10:00:00.000Z",
  };

  const validSplitRequest: SplitChargeRequest = {
    chargeId: "chg_restaurant_1",
    portions: [
      { targetFolioId: "fol_guest_1", amount: 65, description: "Parte 1" },
      { targetFolioId: "fol_guest_2", amount: 65, description: "Parte 2" },
    ],
  };

  describe("mapChargeRoutingRuleDtoToDomain", () => {
    it("maps a valid routing rule DTO to domain", () => {
      const rule = mapChargeRoutingRuleDtoToDomain(validRoutingDto);

      expect(rule.ruleId).toBe("rule_101");
      expect(rule.category).toBe("ROOM_NIGHT");
      expect(rule.percentage).toBe(100);
      expect(rule.createdAt.toISOString()).toBe("2026-10-01T10:00:00.000Z");
    });

    it("throws DomainMappingError when percentage is invalid or category is unknown", () => {
      expect(() =>
        mapChargeRoutingRuleDtoToDomain({ ...validRoutingDto, percentage: 150 }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapChargeRoutingRuleDtoToDomain({
          ...validRoutingDto,
          category: "INVALID" as unknown as "ROOM_NIGHT",
        }),
      ).toThrow(DomainMappingError);
    });
  });

  describe("mapSplitChargeRequestToDto", () => {
    it("maps domain split request to DTO", () => {
      const dto = mapSplitChargeRequestToDto(validSplitRequest);

      expect(dto.charge_id).toBe("chg_restaurant_1");
      expect(dto.portions).toHaveLength(2);
      expect(dto.portions[0].amount).toBe("65.00");
    });

    it("throws DomainMappingError when fewer than 2 portions are provided", () => {
      expect(() =>
        mapSplitChargeRequestToDto({
          chargeId: "chg_1",
          portions: [{ targetFolioId: "fol_1", amount: 100 }],
        }),
      ).toThrow(DomainMappingError);
    });
  });

  describe("mapSplitChargeResultDtoToDomain", () => {
    it("maps split charge result DTO to domain", () => {
      const resultDto: SplitChargeResultDto = {
        original_charge_id: "chg_orig",
        source_folio_id: "fol_01",
        created_charges: [
          {
            charge_id: "chg_sp_1",
            category: "RESTAURANT",
            description: "Parte A",
            amount: "50.00",
            currency: "USD",
            posted_at: "2026-10-01T12:00:00.000Z",
            posted_by: "staff",
            original_split_charge_id: "chg_orig",
          },
        ],
        updated_source_folio: {
          folio_id: "fol_01",
          folio_number: "FOL-01",
          reservation_id: "res_01",
          stay_id: "stay_01",
          type: "GUEST",
          status: "OPEN",
          holder_name: "Juan",
          room_number: "101",
          currency: "USD",
          total_charges: "50.00",
          total_payments: "0.00",
          balance: "50.00",
          charges: [
            {
              charge_id: "chg_sp_1",
              category: "RESTAURANT",
              description: "Parte A",
              amount: "50.00",
              currency: "USD",
              posted_at: "2026-10-01T12:00:00.000Z",
              posted_by: "staff",
              original_split_charge_id: "chg_orig",
            },
          ],
          payments: [],
          created_at: "2026-10-01T12:00:00.000Z",
        },
      };

      const domain = mapSplitChargeResultDtoToDomain(resultDto);
      expect(domain.originalChargeId).toBe("chg_orig");
      expect(domain.createdCharges).toHaveLength(1);
      expect(domain.createdCharges[0].originalSplitChargeId).toBe("chg_orig");
      expect(domain.updatedSourceFolio.balance).toBe(50);
    });
  });
});
