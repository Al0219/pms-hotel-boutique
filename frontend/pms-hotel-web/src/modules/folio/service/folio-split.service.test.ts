import { describe, expect, it } from "vitest";

import { HttpStatusError } from "@/lib/http";

import { splitFolioChargeDto } from "./folio.service";

describe("Folio Split Service", () => {
  it("splits a charge successfully via HTTP service", async () => {
    const result = await splitFolioChargeDto("fol_guest_101", {
      charge_id: "chg_04",
      portions: [
        { target_folio_id: "fol_guest_101", amount: "65.00", description: "Cena Parte 1" },
        { target_folio_id: "fol_company_202", amount: "65.00", description: "Cena Parte 2" },
      ],
    });

    expect(result.original_charge_id).toBe("chg_04");
    expect(result.created_charges).toHaveLength(2);
    expect(result.updated_source_folio).toBeDefined();
  });

  it("throws HttpStatusError when server fails during split", async () => {
    await expect(
      splitFolioChargeDto("fol_guest_101", {
        charge_id: "error_charge",
        portions: [
          { target_folio_id: "fol_guest_101", amount: "50.00" },
          { target_folio_id: "fol_company_202", amount: "50.00" },
        ],
      }),
    ).rejects.toThrow(HttpStatusError);
  });
});
