import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors";

import type {
  AvailabilityResponseDto,
  AvailableRoomTypeDto,
  RatePlanOptionDto,
} from "../dtos/availability.dto";
import {
  mapAvailabilityResponseToDomain,
  mapRatePlanDtoToDomain,
  mapRoomTypeDtoToDomain,
  mapSearchParamsToQueryDto,
} from "./availability.mapper";

describe("Availability Mapper", () => {
  const validRatePlanDto: RatePlanOptionDto = {
    rate_plan_id: "rp_01",
    rate_plan_name: "Tarifa Flexible",
    description: "Cancelación libre",
    base_nightly_rate: "150.00",
    total_amount: "450.00",
    currency: "usd",
    cancellation_policy: "48h antes",
    meals_included: "Desayuno",
  };

  const validRoomTypeDto: AvailableRoomTypeDto = {
    room_type_id: "rt_01",
    name: "Deluxe King",
    code: "DLX-KNG",
    description: "Habitación espaciosa",
    max_occupancy: 2,
    available_rooms_count: 4,
    rate_plans: [validRatePlanDto],
    images: ["/img1.webp"],
  };

  const validResponseDto: AvailabilityResponseDto = {
    property_id: "prop_01",
    check_in_date: "2026-10-01",
    check_out_date: "2026-10-04",
    total_nights: 3,
    available_room_types: [validRoomTypeDto],
  };

  describe("mapRatePlanDtoToDomain", () => {
    it("maps a valid rate plan DTO to domain model with numeric amounts", () => {
      const result = mapRatePlanDtoToDomain(validRatePlanDto);

      expect(result).toEqual({
        ratePlanId: "rp_01",
        name: "Tarifa Flexible",
        description: "Cancelación libre",
        baseNightlyRate: 150,
        totalAmount: 450,
        currency: "USD",
        cancellationPolicy: "48h antes",
        mealsIncluded: "Desayuno",
      });
    });

    it("handles null description and meals_included properly", () => {
      const dtoWithNulls: RatePlanOptionDto = {
        ...validRatePlanDto,
        description: null,
        meals_included: null,
      };

      const result = mapRatePlanDtoToDomain(dtoWithNulls);
      expect(result.description).toBeNull();
      expect(result.mealsIncluded).toBeNull();
    });

    it("throws DomainMappingError when required fields are missing", () => {
      expect(() =>
        mapRatePlanDtoToDomain({ ...validRatePlanDto, rate_plan_id: "" }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapRatePlanDtoToDomain({ ...validRatePlanDto, rate_plan_name: "  " }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapRatePlanDtoToDomain({ ...validRatePlanDto, currency: "" }),
      ).toThrow(DomainMappingError);
    });

    it("throws DomainMappingError when monetary amounts are not valid numbers", () => {
      expect(() =>
        mapRatePlanDtoToDomain({ ...validRatePlanDto, base_nightly_rate: "invalid-number" }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapRatePlanDtoToDomain({ ...validRatePlanDto, total_amount: "-50.00" }),
      ).toThrow(DomainMappingError);
    });
  });

  describe("mapRoomTypeDtoToDomain", () => {
    it("maps a valid room type DTO to domain", () => {
      const result = mapRoomTypeDtoToDomain(validRoomTypeDto);

      expect(result.roomTypeId).toBe("rt_01");
      expect(result.name).toBe("Deluxe King");
      expect(result.code).toBe("DLX-KNG");
      expect(result.maxOccupancy).toBe(2);
      expect(result.availableRoomsCount).toBe(4);
      expect(result.ratePlans).toHaveLength(1);
      expect(result.images).toEqual(["/img1.webp"]);
    });

    it("throws DomainMappingError for invalid max_occupancy or negative available_rooms_count", () => {
      expect(() =>
        mapRoomTypeDtoToDomain({ ...validRoomTypeDto, max_occupancy: 0 }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapRoomTypeDtoToDomain({ ...validRoomTypeDto, available_rooms_count: -1 }),
      ).toThrow(DomainMappingError);
    });
  });

  describe("mapAvailabilityResponseToDomain", () => {
    it("maps complete availability response to domain result", () => {
      const result = mapAvailabilityResponseToDomain(validResponseDto);

      expect(result.propertyId).toBe("prop_01");
      expect(result.checkInDate).toBe("2026-10-01");
      expect(result.checkOutDate).toBe("2026-10-04");
      expect(result.totalNights).toBe(3);
      expect(result.roomTypes).toHaveLength(1);
    });

    it("handles empty available_room_types array cleanly", () => {
      const emptyDto: AvailabilityResponseDto = {
        ...validResponseDto,
        available_room_types: [],
      };

      const result = mapAvailabilityResponseToDomain(emptyDto);
      expect(result.roomTypes).toEqual([]);
    });

    it("throws DomainMappingError when dates or property are missing or total_nights is <= 0", () => {
      expect(() =>
        mapAvailabilityResponseToDomain({ ...validResponseDto, property_id: "" }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapAvailabilityResponseToDomain({ ...validResponseDto, total_nights: 0 }),
      ).toThrow(DomainMappingError);
    });
  });

  describe("mapSearchParamsToQueryDto", () => {
    it("maps domain search parameters to query DTO", () => {
      const dto = mapSearchParamsToQueryDto({
        propertyId: "prop_01",
        checkInDate: "2026-10-01",
        checkOutDate: "2026-10-04",
        adults: 2,
        children: 1,
        roomsCount: 1,
      });

      expect(dto).toEqual({
        property_id: "prop_01",
        check_in_date: "2026-10-01",
        check_out_date: "2026-10-04",
        adults: 2,
        children: 1,
        rooms_count: 1,
      });
    });
  });
});
