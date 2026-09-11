import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import { mapGuestAccount } from "./guest-account.mapper";

describe("mapGuestAccount", () => {
  it("maps a Google identity without exposing its provider payload", () => {
    const account = mapGuestAccount({ account_id: " guest-01 ", email: " guest@example.com ", external_identities: [{ provider: "GOOGLE", external_subject: "google-subject-01", connected_at: "2026-09-10T12:00:00.000Z" }] });
    expect(account).toMatchObject({ id: "guest-01", email: "guest@example.com", externalIdentities: [{ provider: "GOOGLE", subject: "google-subject-01" }] });
  });

  it("keeps an absent account email as null", () => {
    expect(mapGuestAccount({ account_id: "guest-01", email: null, external_identities: [] }).email).toBeNull();
  });

  it("rejects an invalid required account id", () => {
    expect(() => mapGuestAccount({ account_id: " ", email: null, external_identities: [] })).toThrow(DomainMappingError);
  });
});
