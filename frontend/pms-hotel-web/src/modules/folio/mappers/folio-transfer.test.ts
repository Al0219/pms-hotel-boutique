import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors";

import type { FolioDto, TransferChargeResultDto } from "../dtos/folio.dto";
import type { TransferChargeRequest } from "../model/folio";
import {
  mapFolioDtoToDomain,
  mapTransferChargeRequestToDto,
  mapTransferChargeResultDtoToDomain,
} from "./folio.mapper";

describe("Folio Charge Transfer Mappers", () => {
  const validTransferRequest: TransferChargeRequest = {
    chargeId: "chg_transfer_1",
    targetFolioId: "fol_target_99",
    reason: "Guest requested charge on corporate master folio",
  };

  describe("mapTransferChargeRequestToDto", () => {
    it("maps domain transfer request to DTO", () => {
      const dto = mapTransferChargeRequestToDto(validTransferRequest);

      expect(dto.charge_id).toBe("chg_transfer_1");
      expect(dto.target_folio_id).toBe("fol_target_99");
      expect(dto.reason).toBe("Guest requested charge on corporate master folio");
    });

    it("throws DomainMappingError when target folio or reason is missing", () => {
      expect(() =>
        mapTransferChargeRequestToDto({
          chargeId: "chg_1",
          targetFolioId: "",
          reason: "Some reason",
        }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapTransferChargeRequestToDto({
          chargeId: "chg_1",
          targetFolioId: "fol_2",
          reason: "   ",
        }),
      ).toThrow(DomainMappingError);
    });
  });

  describe("mapTransferChargeResultDtoToDomain", () => {
    it("maps transfer charge result DTO to domain", () => {
      const resultDto: TransferChargeResultDto = {
        transferred_charge_id: "chg_transfer_1",
        source_folio_id: "fol_src_1",
        target_folio_id: "fol_target_99",
        reason: "Corporate transfer",
        transferred_at: "2026-10-01T14:30:00.000Z",
        updated_source_folio: {
          folio_id: "fol_src_1",
          folio_number: "FOL-SRC-1",
          reservation_id: "res_01",
          stay_id: "stay_01",
          type: "GUEST",
          status: "OPEN",
          holder_name: "Ana Gomez",
          room_number: "201",
          currency: "USD",
          total_charges: "0.00",
          total_payments: "0.00",
          balance: "0.00",
          charges: [
            {
              charge_id: "chg_transfer_1",
              category: "RESTAURANT",
              description: "Cena",
              amount: "75.00",
              currency: "USD",
              posted_at: "2026-10-01T12:00:00.000Z",
              posted_by: "staff",
              is_transferred: true,
              transferred_to_folio_id: "fol_target_99",
              transfer_reason: "Corporate transfer",
            },
          ],
          payments: [],
          created_at: "2026-10-01T10:00:00.000Z",
        },
      };

      const domain = mapTransferChargeResultDtoToDomain(resultDto);
      expect(domain.transferredChargeId).toBe("chg_transfer_1");
      expect(domain.sourceFolioId).toBe("fol_src_1");
      expect(domain.targetFolioId).toBe("fol_target_99");
      expect(domain.reason).toBe("Corporate transfer");
      expect(domain.transferredAt.toISOString()).toBe("2026-10-01T14:30:00.000Z");
      expect(domain.updatedSourceFolio.charges[0].isTransferred).toBe(true);
      expect(domain.updatedSourceFolio.charges[0].transferredToFolioId).toBe("fol_target_99");
    });
  });

  describe("mapFolioDtoToDomain balance calculation with transferred charges", () => {
    it("excludes transferred charges from total balance calculation", () => {
      const folioDto: FolioDto = {
        folio_id: "fol_test_calc",
        folio_number: "FOL-TEST",
        reservation_id: "res_01",
        stay_id: "stay_01",
        type: "GUEST",
        status: "OPEN",
        holder_name: "Carlos",
        room_number: "102",
        currency: "USD",
        total_charges: "100.00",
        total_payments: "0.00",
        balance: "100.00",
        charges: [
          {
            charge_id: "chg_active",
            category: "SPA",
            description: "Masaje",
            amount: "100.00",
            currency: "USD",
            posted_at: "2026-10-01T10:00:00.000Z",
            posted_by: "staff",
            is_transferred: false,
          },
          {
            charge_id: "chg_transferred",
            category: "RESTAURANT",
            description: "Almuerzo transferido",
            amount: "50.00",
            currency: "USD",
            posted_at: "2026-10-01T11:00:00.000Z",
            posted_by: "staff",
            is_transferred: true,
            transferred_to_folio_id: "fol_master_1",
          },
        ],
        payments: [],
        created_at: "2026-10-01T10:00:00.000Z",
      };

      const domain = mapFolioDtoToDomain(folioDto);
      expect(domain.totalCharges).toBe(100);
      expect(domain.balance).toBe(100);
    });
  });
});
