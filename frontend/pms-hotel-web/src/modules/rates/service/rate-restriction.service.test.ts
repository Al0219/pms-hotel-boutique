import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchRateRestrictionsDto, batchUpdateRateRestrictionsDto } from "./rate-restriction.service";

describe("rate-restriction.service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches rate restrictions DTO with query params successfully", async () => {
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

    const result = await fetchRateRestrictionsDto({
      property_id: "prop-antigua",
      start_date: "2026-10-01",
      end_date: "2026-10-07",
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(result.restrictions).toHaveLength(1);
    expect(result.restrictions[0].restriction_id).toBe("res-001");
    expect(result.restrictions[0].closed_to_arrival).toBe(true);
  });

  it("throws error when fetch fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({ error: { message: "Internal Server Error" } }),
    } as Response);

    await expect(
      fetchRateRestrictionsDto({
        property_id: "prop-antigua",
        start_date: "2026-10-01",
        end_date: "2026-10-07",
      })
    ).rejects.toThrow();
  });

  it("sends batch update DTO payload successfully", async () => {
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

    const result = await batchUpdateRateRestrictionsDto({
      property_id: "prop-antigua",
      restrictions: [
        {
          rate_plan_id: "rp-bar",
          room_type_id: "rt-deluxe",
          date: "2026-10-01",
          stop_sell: true,
        },
      ],
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.updated_count).toBe(1);
    expect(result.restrictions[0].stop_sell).toBe(true);
  });
});
