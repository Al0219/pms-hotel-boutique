import { describe, expect, it } from "vitest";

import { HttpStatusError } from "@/lib/http";

import { fetchFolioByIdDto } from "./folio.service";

describe("Folio Service", () => {
  it("fetches folio DTO successfully by ID", async () => {
    const result = await fetchFolioByIdDto("fol_guest_101");

    expect(result.folio_id).toBe("fol_guest_101");
    expect(result.folio_number).toBe("FOL-2026-0089");
    expect(result.type).toBe("GUEST");
    expect(result.status).toBe("OPEN");
    expect(result.charges.length).toBeGreaterThan(0);
    expect(result.payments.length).toBeGreaterThan(0);
  });

  it("throws HttpStatusError when folio is not found (404)", async () => {
    await expect(fetchFolioByIdDto("missing_folio")).rejects.toThrow(HttpStatusError);
  });

  it("throws HttpStatusError when server returns 500", async () => {
    await expect(fetchFolioByIdDto("error_folio")).rejects.toThrow(HttpStatusError);
  });
});
