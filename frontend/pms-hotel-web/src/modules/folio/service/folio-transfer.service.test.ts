import { describe, expect, it } from "vitest";

import { HttpStatusError } from "@/lib/http";

import { transferFolioChargeDto } from "./folio.service";

describe("Folio Transfer Service", () => {
  it("transfers a charge successfully via HTTP service", async () => {
    const result = await transferFolioChargeDto("fol_guest_101", {
      charge_id: "chg_03",
      target_folio_id: "fol_company_202",
      reason: "Corporate billing request by guest",
    });

    expect(result.transferred_charge_id).toBe("chg_03");
    expect(result.target_folio_id).toBe("fol_company_202");
    expect(result.reason).toBe("Corporate billing request by guest");
    expect(result.updated_source_folio).toBeDefined();
  });

  it("throws HttpStatusError when server fails during transfer", async () => {
    await expect(
      transferFolioChargeDto("fol_guest_101", {
        charge_id: "error_charge",
        target_folio_id: "fol_company_202",
        reason: "Test failure",
      }),
    ).rejects.toThrow(HttpStatusError);
  });
});
