import { describe, expect, it } from "vitest";

import { fetchRatePlanByIdDto, fetchRatePlansDto } from "./rate-plan.service";

describe("RatePlan Service", () => {
  it("fetches all rate plans successfully", async () => {
    const result = await fetchRatePlansDto();

    expect(result).toBeDefined();
    expect(result.rate_plans.length).toBeGreaterThan(0);
    expect(result.total_count).toBeGreaterThan(0);
  });

  it("filters rate plans by status", async () => {
    const result = await fetchRatePlansDto({ status: "ACTIVE" });

    expect(result.rate_plans.length).toBeGreaterThan(0);
    expect(result.rate_plans.every((rp) => rp.status === "ACTIVE")).toBe(true);
  });

  it("filters rate plans by search query", async () => {
    const result = await fetchRatePlansDto({ search: "Flexible" });

    expect(result.rate_plans.length).toBeGreaterThan(0);
    expect(result.rate_plans[0].code).toBe("BAR-FLEX");
  });

  it("fetches single rate plan by ID", async () => {
    const result = await fetchRatePlanByIdDto("rp_bar_flex");

    expect(result).toBeDefined();
    expect(result.rate_plan_id).toBe("rp_bar_flex");
    expect(result.code).toBe("BAR-FLEX");
  });

  it("throws error on missing or invalid ID", async () => {
    await expect(fetchRatePlanByIdDto("missing_rate_plan")).rejects.toThrow();
  });
});
