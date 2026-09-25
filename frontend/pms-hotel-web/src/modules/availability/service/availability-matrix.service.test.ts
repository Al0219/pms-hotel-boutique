import { describe, expect, it } from "vitest";

import { fetchAvailabilityMatrixDto } from "./availability-matrix.service";

describe("Availability Matrix Service", () => {
  it("fetches availability matrix data for given property and date range", async () => {
    const response = await fetchAvailabilityMatrixDto({
      property_id: "prop_boutique_01",
      start_date: "2026-10-01",
      end_date: "2026-10-07",
    });

    expect(response).toBeDefined();
    expect(response.property_id).toBe("prop_boutique_01");
    expect(response.dates).toHaveLength(7);
    expect(response.matrix.length).toBeGreaterThan(0);
    expect(response.total_property_physical_rooms).toBeGreaterThan(0);
    expect(response.daily_summaries).toHaveLength(7);
  });

  it("filters matrix by specific room type when requested", async () => {
    const response = await fetchAvailabilityMatrixDto({
      property_id: "prop_boutique_01",
      start_date: "2026-10-01",
      end_date: "2026-10-04",
      room_type_id: "rt_deluxe_king",
    });

    expect(response.matrix).toHaveLength(1);
    expect(response.matrix[0].room_type_id).toBe("rt_deluxe_king");
  });

  it("throws error when server responds with 500 error", async () => {
    await expect(
      fetchAvailabilityMatrixDto({
        property_id: "error_property",
        start_date: "2026-10-01",
        end_date: "2026-10-04",
      }),
    ).rejects.toThrow();
  });
});
