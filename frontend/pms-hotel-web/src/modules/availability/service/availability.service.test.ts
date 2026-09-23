import { describe, expect, it } from "vitest";

import { HttpStatusError } from "@/lib/http";

import { fetchAvailabilityDto } from "./availability.service";

describe("Availability Service", () => {
  it("fetches availability DTO successfully from mock API", async () => {
    const result = await fetchAvailabilityDto({
      property_id: "prop_boutique_01",
      check_in_date: "2026-10-01",
      check_out_date: "2026-10-04",
      adults: 2,
      children: 0,
      rooms_count: 1,
    });

    expect(result.property_id).toBe("prop_boutique_01");
    expect(result.check_in_date).toBe("2026-10-01");
    expect(result.check_out_date).toBe("2026-10-04");
    expect(result.total_nights).toBe(3);
    expect(result.available_room_types).toHaveLength(2);
    expect(result.available_room_types[0].code).toBe("DLX-KNG");
  });

  it("handles empty availability results from mock API", async () => {
    const result = await fetchAvailabilityDto({
      property_id: "empty_property",
      check_in_date: "2026-10-01",
      check_out_date: "2026-10-04",
      adults: 2,
      children: 0,
      rooms_count: 1,
    });

    expect(result.available_room_types).toEqual([]);
  });

  it("throws HttpStatusError when server returns an error", async () => {
    await expect(
      fetchAvailabilityDto({
        property_id: "error_property",
        check_in_date: "2026-10-01",
        check_out_date: "2026-10-04",
        adults: 2,
        children: 0,
        rooms_count: 1,
      }),
    ).rejects.toThrow(HttpStatusError);
  });
});
