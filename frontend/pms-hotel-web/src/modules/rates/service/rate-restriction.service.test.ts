import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchRateRestrictions, batchUpdateRateRestrictions } from "./rate-restriction.service";

describe("rate-restriction.service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches rate restrictions with query params successfully", async () => {
    const mockDto = {
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

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ restrictions: [mockDto] }),
    } as Response);

    const result = await fetchRateRestrictions({
      propertyId: "prop-antigua",
      startDate: "2026-10-01",
      endDate: "2026-10-07",
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].restrictionId).toBe("res-001");
    expect(result[0].closedToArrival).toBe(true);
  });

  it("throws error when fetch fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      statusText: "Internal Server Error",
    } as Response);

    await expect(
      fetchRateRestrictions({
        propertyId: "prop-antigua",
        startDate: "2026-10-01",
        endDate: "2026-10-07",
      })
    ).rejects.toThrow("Error al consultar restricciones tarifarias");
  });

  it("sends batch update successfully", async () => {
    const mockResult = {
      success: true,
      updated_count: 1,
      restrictions: [
        {
          restriction_id: "res-001",
          property_id: "prop-antigua",
          rate_plan_id: "rp-bar",
          room_type_id: "rt-deluxe",
          date: "2026-10-01",
          closed_to_arrival: false,
          closed_to_departure: false,
          min_length_of_stay: 1,
          stop_sell: true,
          created_at: "2026-09-01T10:00:00Z",
          updated_at: "2026-09-01T12:00:00Z",
        },
      ],
    };

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockResult,
    } as Response);

    const result = await batchUpdateRateRestrictions({
      propertyId: "prop-antigua",
      restrictions: [
        {
          ratePlanId: "rp-bar",
          roomTypeId: "rt-deluxe",
          date: "2026-10-01",
          stopSell: true,
        },
      ],
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.updatedCount).toBe(1);
    expect(result.restrictions[0].stopSell).toBe(true);
  });
});
