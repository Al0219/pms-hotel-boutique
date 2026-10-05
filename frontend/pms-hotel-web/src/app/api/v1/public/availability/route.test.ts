import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const query = "check_in_date=2026-10-10&check_out_date=2026-10-12&adults=2&children=0&rooms_count=1";
afterEach(() => vi.unstubAllEnvs());

describe("Public availability demo route", () => {
  it("does not expose fixture inventory when mock mode is disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    const response = await GET(new Request(`http://localhost/api/v1/public/availability?${query}`));
    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty("available_room_types");
  });
  it("uses the requested dates in explicit demo mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
    const response = await GET(new Request(`http://localhost/api/v1/public/availability?${query}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ check_in_date: "2026-10-10", check_out_date: "2026-10-12", total_nights: 2 });
  });
});
