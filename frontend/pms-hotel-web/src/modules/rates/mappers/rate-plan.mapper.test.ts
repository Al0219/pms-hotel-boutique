import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors";
import {
  mapRatePlanDtoToDomain,
  mapRatePlanListFiltersToDto,
  mapRatePlanListResponseDtoToDomain,
} from "./rate-plan.mapper";

describe("RatePlan Mapper", () => {
  it("maps valid RatePlanDto to domain model", () => {
    const dto = {
      rate_plan_id: "rp_bar_flex",
      property_id: "prop_boutique_01",
      code: "BAR-FLEX",
      name: "Tarifa Flexible BAR",
      description: "Cancelación sin costo hasta 48h antes",
      status: "ACTIVE" as const,
      pricing_model: "PER_NIGHT" as const,
      currency: "USD",
      base_price_multiplier: 1.0,
      cancellation_policy: "Cancelación gratuita hasta 48h",
      meals_included: "Desayuno incluido",
      applicable_room_type_ids: ["rt_deluxe_king", "rt_exec_double"],
      created_at: "2026-01-10T10:00:00.000Z",
      updated_at: "2026-09-01T12:00:00.000Z",
    };

    const domain = mapRatePlanDtoToDomain(dto);

    expect(domain.ratePlanId).toBe("rp_bar_flex");
    expect(domain.propertyId).toBe("prop_boutique_01");
    expect(domain.code).toBe("BAR-FLEX");
    expect(domain.status).toBe("ACTIVE");
    expect(domain.pricingModel).toBe("PER_NIGHT");
    expect(domain.basePriceMultiplier).toBe(1.0);
    expect(domain.applicableRoomTypeIds).toEqual(["rt_deluxe_king", "rt_exec_double"]);
    expect(domain.createdAt).toBeInstanceOf(Date);
    expect(domain.updatedAt).toBeInstanceOf(Date);
  });

  it("throws DomainMappingError on invalid status or missing mandatory fields", () => {
    expect(() =>
      mapRatePlanDtoToDomain({
        rate_plan_id: "",
        property_id: "prop_01",
        code: "BAR",
        name: "Bar",
        description: null,
        status: "ACTIVE" as const,
        pricing_model: "PER_NIGHT" as const,
        currency: "USD",
        base_price_multiplier: 1.0,
        cancellation_policy: "Standard",
        meals_included: null,
        applicable_room_type_ids: [],
        created_at: "2026-01-10T10:00:00.000Z",
        updated_at: "2026-09-01T12:00:00.000Z",
      }),
    ).toThrow(DomainMappingError);

    expect(() =>
      mapRatePlanDtoToDomain({
        rate_plan_id: "rp_01",
        property_id: "prop_01",
        code: "BAR",
        name: "Bar",
        description: null,
        status: "INVALID_STATUS" as unknown as "ACTIVE",
        pricing_model: "PER_NIGHT" as const,
        currency: "USD",
        base_price_multiplier: 1.0,
        cancellation_policy: "Standard",
        meals_included: null,
        applicable_room_type_ids: [],
        created_at: "2026-01-10T10:00:00.000Z",
        updated_at: "2026-09-01T12:00:00.000Z",
      }),
    ).toThrow(DomainMappingError);
  });

  it("maps RatePlanListResponseDto to domain", () => {
    const listDto = {
      rate_plans: [
        {
          rate_plan_id: "rp_01",
          property_id: "prop_01",
          code: "BAR",
          name: "Bar Plan",
          description: null,
          status: "ACTIVE" as const,
          pricing_model: "PER_NIGHT" as const,
          currency: "USD",
          base_price_multiplier: 1.0,
          cancellation_policy: "Standard",
          meals_included: null,
          applicable_room_type_ids: [],
          created_at: "2026-01-10T10:00:00.000Z",
          updated_at: "2026-09-01T12:00:00.000Z",
        },
      ],
      total_count: 1,
    };

    const result = mapRatePlanListResponseDtoToDomain(listDto);
    expect(result.ratePlans).toHaveLength(1);
    expect(result.totalCount).toBe(1);
  });

  it("maps RatePlanListFilters to DTO", () => {
    const filters = {
      propertyId: "prop_01",
      status: "ACTIVE" as const,
      search: "promo",
    };

    const dto = mapRatePlanListFiltersToDto(filters);
    expect(dto).toEqual({
      property_id: "prop_01",
      status: "ACTIVE",
      search: "promo",
    });
  });
});
