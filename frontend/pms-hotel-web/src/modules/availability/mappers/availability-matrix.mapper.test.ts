import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors";
import {
  mapAvailabilityMatrixQueryToDto,
  mapAvailabilityMatrixResponseToDomain,
  mapDailyRoomTypeAvailabilityDtoToDomain,
  mapRoomTypeMatrixDtoToDomain,
} from "./availability-matrix.mapper";

describe("Availability Matrix Mappers", () => {
  describe("mapAvailabilityMatrixQueryToDto", () => {
    it("maps valid query object to DTO format", () => {
      const query = {
        propertyId: "prop_boutique_01",
        startDate: "2026-10-01",
        endDate: "2026-10-07",
        roomTypeId: "rt_deluxe_king",
      };

      const dto = mapAvailabilityMatrixQueryToDto(query);

      expect(dto).toEqual({
        property_id: "prop_boutique_01",
        start_date: "2026-10-01",
        end_date: "2026-10-07",
        room_type_id: "rt_deluxe_king",
      });
    });

    it("throws DomainMappingError on invalid or reversed dates", () => {
      expect(() =>
        mapAvailabilityMatrixQueryToDto({
          propertyId: "prop_01",
          startDate: "2026-10-10",
          endDate: "2026-10-01",
        }),
      ).toThrow(DomainMappingError);

      expect(() =>
        mapAvailabilityMatrixQueryToDto({
          propertyId: "prop_01",
          startDate: "invalid-date",
          endDate: "2026-10-05",
        }),
      ).toThrow(DomainMappingError);
    });
  });

  describe("mapDailyRoomTypeAvailabilityDtoToDomain", () => {
    it("maps daily availability metrics correctly", () => {
      const dto = {
        date: "2026-10-01",
        physical_rooms: 10,
        sold_rooms: 4,
        ooo_rooms: 1,
        oos_rooms: 0,
        overbooking_adjustment: 0,
        ats: 5,
        occupancy_rate: 44,
        stop_sell: false,
        min_los: 2,
      };

      const domain = mapDailyRoomTypeAvailabilityDtoToDomain(dto);

      expect(domain.date).toBe("2026-10-01");
      expect(domain.physicalRooms).toBe(10);
      expect(domain.soldRooms).toBe(4);
      expect(domain.oooRooms).toBe(1);
      expect(domain.ats).toBe(5);
      expect(domain.occupancyRate).toBe(44);
      expect(domain.stopSell).toBe(false);
      expect(domain.minLos).toBe(2);
    });
  });

  describe("mapRoomTypeMatrixDtoToDomain", () => {
    it("maps room type matrix with daily items", () => {
      const dto = {
        room_type_id: "rt_deluxe_king",
        room_type_name: "Deluxe King Suite",
        room_type_code: "DLX-KNG",
        total_physical_capacity: 10,
        daily_availability: [
          {
            date: "2026-10-01",
            physical_rooms: 10,
            sold_rooms: 4,
            ooo_rooms: 1,
            oos_rooms: 0,
            overbooking_adjustment: 0,
            ats: 5,
            occupancy_rate: 44,
          },
        ],
      };

      const domain = mapRoomTypeMatrixDtoToDomain(dto);

      expect(domain.roomTypeId).toBe("rt_deluxe_king");
      expect(domain.roomTypeName).toBe("Deluxe King Suite");
      expect(domain.totalPhysicalCapacity).toBe(10);
      expect(domain.dailyAvailability).toHaveLength(1);
    });
  });

  describe("mapAvailabilityMatrixResponseToDomain", () => {
    it("maps full availability matrix response", () => {
      const dto = {
        property_id: "prop_boutique_01",
        start_date: "2026-10-01",
        end_date: "2026-10-03",
        dates: ["2026-10-01", "2026-10-02", "2026-10-03"],
        matrix: [
          {
            room_type_id: "rt_deluxe_king",
            room_type_name: "Deluxe King Suite",
            room_type_code: "DLX-KNG",
            total_physical_capacity: 10,
            daily_availability: [
              {
                date: "2026-10-01",
                physical_rooms: 10,
                sold_rooms: 3,
                ooo_rooms: 0,
                oos_rooms: 0,
                overbooking_adjustment: 0,
                ats: 7,
                occupancy_rate: 30,
              },
            ],
          },
        ],
        total_property_physical_rooms: 10,
        daily_summaries: [
          {
            date: "2026-10-01",
            total_physical: 10,
            total_sold: 3,
            total_ooo: 0,
            total_oos: 0,
            total_ats: 7,
            average_occupancy_rate: 30,
          },
        ],
      };

      const domain = mapAvailabilityMatrixResponseToDomain(dto);

      expect(domain.propertyId).toBe("prop_boutique_01");
      expect(domain.dates).toHaveLength(3);
      expect(domain.matrix).toHaveLength(1);
      expect(domain.totalPropertyPhysicalRooms).toBe(10);
      expect(domain.dailySummaries).toHaveLength(1);
    });
  });
});
