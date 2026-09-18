import { describe, it, expect } from "vitest";
import {
  toDomainRateRestriction,
  toDtoRateRestrictionQuery,
  toDtoUpdateRestrictionItem,
  toDtoBatchUpdatePayload,
  toDomainRateRestrictionBatchResult,
} from "./rate-restriction.mapper";
import { RateRestrictionDto } from "../dtos/rate-restriction.dto";

describe("rate-restriction.mapper", () => {
  const sampleDto: RateRestrictionDto = {
    restriction_id: "res-001",
    property_id: "prop-antigua",
    rate_plan_id: "rp-bar",
    room_type_id: "rt-deluxe",
    date: "2026-10-01",
    closed_to_arrival: true,
    closed_to_departure: false,
    min_length_of_stay: 2,
    stop_sell: false,
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T12:00:00Z",
  };

  it("maps RateRestrictionDto to domain model", () => {
    const domain = toDomainRateRestriction(sampleDto);
    expect(domain.restrictionId).toBe("res-001");
    expect(domain.propertyId).toBe("prop-antigua");
    expect(domain.ratePlanId).toBe("rp-bar");
    expect(domain.roomTypeId).toBe("rt-deluxe");
    expect(domain.date).toBe("2026-10-01");
    expect(domain.closedToArrival).toBe(true);
    expect(domain.closedToDeparture).toBe(false);
    expect(domain.minLengthOfStay).toBe(2);
    expect(domain.stopSell).toBe(false);
    expect(domain.createdAt).toBeInstanceOf(Date);
  });

  it("enforces minLengthOfStay >= 1 when mapping", () => {
    const customDto = { ...sampleDto, min_length_of_stay: 0 };
    const domain = toDomainRateRestriction(customDto);
    expect(domain.minLengthOfStay).toBe(1);
  });

  it("maps query filter to query DTO", () => {
    const filter = {
      propertyId: "prop-antigua",
      startDate: "2026-10-01",
      endDate: "2026-10-07",
      ratePlanId: "rp-bar",
    };
    const dto = toDtoRateRestrictionQuery(filter);
    expect(dto.property_id).toBe("prop-antigua");
    expect(dto.start_date).toBe("2026-10-01");
    expect(dto.end_date).toBe("2026-10-07");
    expect(dto.rate_plan_id).toBe("rp-bar");
  });

  it("maps batch update parameters to batch DTO", () => {
    const payload = toDtoBatchUpdatePayload({
      propertyId: "prop-antigua",
      restrictions: [
        {
          ratePlanId: "rp-bar",
          roomTypeId: "rt-deluxe",
          date: "2026-10-01",
          closedToArrival: true,
          minLengthOfStay: 3,
          stopSell: false,
        },
      ],
    });

    expect(payload.property_id).toBe("prop-antigua");
    expect(payload.restrictions).toHaveLength(1);
    expect(payload.restrictions[0].closed_to_arrival).toBe(true);
    expect(payload.restrictions[0].min_length_of_stay).toBe(3);
  });

  it("maps batch result DTO to domain", () => {
    const batchResultDto = {
      success: true,
      updated_count: 1,
      restrictions: [sampleDto],
    };

    const domain = toDomainRateRestrictionBatchResult(batchResultDto);
    expect(domain.success).toBe(true);
    expect(domain.updatedCount).toBe(1);
    expect(domain.restrictions).toHaveLength(1);
    expect(domain.restrictions[0].restrictionId).toBe("res-001");
  });
});
