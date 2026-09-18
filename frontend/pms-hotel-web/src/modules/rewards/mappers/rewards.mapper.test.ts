import { describe, expect, it } from "vitest";

import { mapRewardsProgram } from "./rewards.mapper";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

describe("rewards.mapper", () => {
  it("maps valid RewardsProgramDTO correctly", () => {
    const dto = {
      account_id: "ACC-01",
      current_tier: "Silver",
      current_nights: 3,
      target_nights: 8,
      next_tier: "Gold",
      benefits: [
        {
          id: "BEN-01",
          title: "Late check-out sujeto a disponibilidad",
          description: "Salida hasta las 13:00 hrs sin costo adicional",
          is_active: true,
        },
      ],
    };

    const domain = mapRewardsProgram(dto);
    expect(domain.currentTier).toBe("Silver");
    expect(domain.benefits).toHaveLength(1);
    expect(domain.benefits[0].title).toContain("Late check-out");
  });

  it("throws DomainMappingError when account_id is missing", () => {
    expect(() =>
      mapRewardsProgram({
        account_id: "",
        current_tier: "Silver",
      } as any)
    ).toThrow(DomainMappingError);
  });
});
