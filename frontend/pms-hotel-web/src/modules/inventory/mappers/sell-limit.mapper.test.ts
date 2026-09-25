import { describe, it, expect } from "vitest";
import {
  toDomainSellLimit,
  toDomainSellLimitList,
  toDtoUpdateSellLimit,
} from "./sell-limit.mapper";
import { calculateSellableATS } from "../model/sell-limit";
import { SellLimitDto } from "../dtos/sell-limit.dto";

describe("sell-limit.mapper & calculateSellableATS", () => {
  describe("calculateSellableATS domain calculations", () => {
    it("calculates standard ATS when no overbooking or sell limit exists", () => {
      // Physical: 10, OOO: 1, OOS: 1, Sold: 3 => Available: 5
      const ats = calculateSellableATS(10, 1, 1, 3, 0, null);
      expect(ats).toBe(5);
    });

    it("increases ATS when overbooking margin is positive", () => {
      // Physical: 10, OOO: 1, OOS: 1, Sold: 3 => Base: 5, Overbooking: +2 => ATS: 7
      const ats = calculateSellableATS(10, 1, 1, 3, 2, null);
      expect(ats).toBe(7);
    });

    it("caps ATS when sell limit is lower than available ATS", () => {
      // Base: 5, Overbooking: +2 => 7, but Sell Limit is capped at 4 => ATS: 4
      const ats = calculateSellableATS(10, 1, 1, 3, 2, 4);
      expect(ats).toBe(4);
    });

    it("does not drop ATS below 0 when deductions exceed physical capacity", () => {
      // Physical: 5, OOO: 3, OOS: 2, Sold: 4 => Base: 0
      const ats = calculateSellableATS(5, 3, 2, 4, 0, null);
      expect(ats).toBe(0);
    });
  });

  describe("toDomainSellLimit", () => {
    const sampleDto: SellLimitDto = {
      limit_id: "lim_001",
      property_id: "prop_boutique_01",
      room_type_id: "rt_deluxe_king",
      room_type_name: "Deluxe King Suite",
      date: "2026-10-01",
      physical_rooms_count: 10,
      ooo_rooms_count: 1,
      oos_rooms_count: 0,
      sold_rooms_count: 4,
      overbooking_limit: 2,
      sell_limit: null,
      calculated_ats: 7,
      updated_at: "2026-09-01T12:00:00Z",
    };

    it("maps SellLimitDto to domain and verifies physical count invariance", () => {
      const domain = toDomainSellLimit(sampleDto);
      expect(domain.limitId).toBe("lim_001");
      expect(domain.propertyId).toBe("prop_boutique_01");
      expect(domain.roomTypeId).toBe("rt_deluxe_king");
      expect(domain.physicalRoomsCount).toBe(10); // Physical count is untouched
      expect(domain.calculatedATS).toBe(7); // 10 - 1 - 0 - 4 + 2 = 7
      expect(domain.updatedAt).toBeInstanceOf(Date);
    });

    it("maps list of DTOs", () => {
      const list = toDomainSellLimitList({
        items: [sampleDto],
        total_count: 1,
      });
      expect(list).toHaveLength(1);
      expect(list[0].limitId).toBe("lim_001");
    });

    it("maps update params to DTO", () => {
      const dto = toDtoUpdateSellLimit({
        propertyId: "prop_boutique_01",
        roomTypeId: "rt_deluxe_king",
        date: "2026-10-01",
        overbookingLimit: 3,
        sellLimit: 6,
      });

      expect(dto.property_id).toBe("prop_boutique_01");
      expect(dto.overbooking_limit).toBe(3);
      expect(dto.sell_limit).toBe(6);
    });
  });
});
