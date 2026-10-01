import { describe, it, expect } from "vitest";
import {
  fetchFolioByIdDto,
  splitFolioChargeDto,
  transferFolioChargeDto,
  createChargeRoutingRuleDto,
} from "./folio.service";

describe("Folio Service", () => {
  it("fetches folio DTO successfully", async () => {
    const result = await fetchFolioByIdDto("fol_guest_101");
    expect(result).toBeDefined();
    expect(result.folio_id).toBe("fol_guest_101");
    expect(result.holder_name).toBe("Carlos Morales");
  });

  it("splits folio charge DTO successfully", async () => {
    const payload = {
      charge_id: "chg_01",
      portions: [
        { target_folio_id: "fol_split_1", amount: "125.00" },
        { target_folio_id: "fol_split_2", amount: "125.00" },
      ],
    };

    const result = await splitFolioChargeDto("fol_guest_101", payload);
    expect(result).toBeDefined();
    expect(result.original_charge_id).toBe("chg_01");
    expect(result.created_charges).toHaveLength(2);
  });

  it("transfers folio charge DTO successfully", async () => {
    const payload = {
      charge_id: "chg_02",
      target_folio_id: "fol_company_202",
      reason: "Cobertura de empresa",
    };

    const result = await transferFolioChargeDto("fol_guest_101", payload);
    expect(result).toBeDefined();
    expect(result.transferred_charge_id).toBe("chg_02");
    expect(result.target_folio_id).toBe("fol_company_202");
  });

  it("creates charge routing rule DTO successfully", async () => {
    const payload = {
      target_folio_id: "fol_target_202",
      category: "ROOM_NIGHT" as const,
      percentage: 100,
    };

    const result = await createChargeRoutingRuleDto("fol_guest_101", payload);
    expect(result).toBeDefined();
    expect(result.rule_id).toBeDefined();
    expect(result.target_folio_id).toBe("fol_target_202");
    expect(result.category).toBe("ROOM_NIGHT");
  });
});
