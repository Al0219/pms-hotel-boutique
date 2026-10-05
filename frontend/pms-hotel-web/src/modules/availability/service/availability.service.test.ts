import { describe, expect, it } from "vitest";

import { HttpStatusError } from "@/lib/http";

import { fetchAvailabilityDto } from "./availability.service";
import { http, HttpResponse } from "msw";
import { mockServer } from "@/data/mocks/server";
import { setAuthToken } from "@/lib/http/interceptors";

describe("Availability Service", () => {
  it("does not send a Staff token with a public availability query", async () => {
    const requests: Request[] = [];
    mockServer.use(http.get("*/api/v1/public/availability", ({ request }) => {
      requests.push(request);
      return HttpResponse.json({});
    }));
    setAuthToken("staff-token-for-test");
    try {
      await fetchAvailabilityDto({ check_in_date: "2026-10-10", check_out_date: "2026-10-12", adults: 2, children: 0, rooms_count: 1 });
      expect(requests).toHaveLength(1);
      expect(requests[0].headers.has("authorization")).toBe(false);
      expect(new URL(requests[0].url).searchParams.get("rooms_count")).toBe("1");
    } finally { setAuthToken(null); }
  });

  it("returns demo dates and totals for the requested stay instead of a fixed fixture date", async () => {
    const result = await fetchAvailabilityDto({ check_in_date: "2026-10-10", check_out_date: "2026-10-15", adults: 4, children: 0, rooms_count: 2 });
    expect(result.check_in_date).toBe("2026-10-10");
    expect(result.check_out_date).toBe("2026-10-15");
    expect(result.total_nights).toBe(5);
    expect(result.available_room_types[0].rate_plans[0].total_amount).toBe("1250.00");
  });

  it("returns empty demo inventory when the requested quantity exceeds ATS", async () => {
    const result = await fetchAvailabilityDto({ check_in_date: "2026-10-10", check_out_date: "2026-10-15", adults: 8, children: 0, rooms_count: 8 });
    expect(result.available_room_types).toEqual([]);
  });

  it("preserves different room type options for a group instead of requiring all rooms to have one type", async () => {
    const result = await fetchAvailabilityDto({ check_in_date: "2026-10-10", check_out_date: "2026-10-15", adults: 6, children: 0, rooms_count: 6 });
    expect(result.available_room_types.map(room => room.available_rooms_count)).toEqual([5, 2]);
    expect(result.available_room_types.map(room => room.room_type_id)).toEqual(["rt_deluxe_king", "rt_master_suite"]);
  });

  it("rejects invalid dates in the demo endpoint", async () => {
    await expect(fetchAvailabilityDto({ check_in_date: "2026-02-30", check_out_date: "2026-03-05", adults: 2, children: 0, rooms_count: 1 })).rejects.toThrow(HttpStatusError);
  });
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
