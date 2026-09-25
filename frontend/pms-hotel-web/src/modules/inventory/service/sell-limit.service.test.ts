import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSellLimits, updateSellLimit } from "./sell-limit.service";

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

  it("fetches sell limits successfully", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [mockDto], total_count: 1 }),
    } as Response);

    const result = await fetchSellLimits("prop_boutique_01", "2026-10-01", "2026-10-07");

    expect(fetchSpy).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].limitId).toBe("lim_001");
    expect(result[0].calculatedATS).toBe(7);
  });

  it("throws error when fetchSellLimits fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      statusText: "Not Found",
    } as Response);

    await expect(fetchSellLimits("prop_boutique_01")).rejects.toThrow(
      "Error al consultar límites de venta"
    );
  });

  it("updates sell limit successfully", async () => {
    const updatedDto = { ...mockDto, overbooking_limit: 3, calculated_ats: 8 };

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => updatedDto,
    } as Response);

    const result = await updateSellLimit({
      propertyId: "prop_boutique_01",
      roomTypeId: "rt_deluxe_king",
      date: "2026-10-01",
      overbookingLimit: 3,
      sellLimit: null,
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(result.overbookingLimit).toBe(3);
    expect(result.calculatedATS).toBe(8);
  });
});
