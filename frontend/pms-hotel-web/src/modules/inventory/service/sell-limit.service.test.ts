import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSellLimitsDto, updateSellLimitDto } from "./sell-limit.service";

describe("sell-limit.service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockDto = {
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

  it("fetches sell limits DTO successfully", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [mockDto], total_count: 1 }),
    } as Response);

    const result = await fetchSellLimitsDto({
      property_id: "prop_boutique_01",
      start_date: "2026-10-01",
      end_date: "2026-10-07",
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].limit_id).toBe("lim_001");
    expect(result.items[0].calculated_ats).toBe(7);
  });

  it("throws error when fetchSellLimits fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ error: { message: "Not Found" } }),
    } as Response);

    await expect(fetchSellLimitsDto({ property_id: "prop_boutique_01" })).rejects.toThrow();
  });

  it("updates sell limit DTO successfully", async () => {
    const updatedDto = { ...mockDto, overbooking_limit: 3, calculated_ats: 8 };

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => updatedDto,
    } as Response);

    const result = await updateSellLimitDto({
      property_id: "prop_boutique_01",
      room_type_id: "rt_deluxe_king",
      date: "2026-10-01",
      overbooking_limit: 3,
      sell_limit: null,
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(result.overbooking_limit).toBe(3);
    expect(result.calculated_ats).toBe(8);
  });
});
