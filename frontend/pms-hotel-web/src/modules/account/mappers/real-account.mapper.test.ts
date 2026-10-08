import { describe, expect, it } from "vitest";
import { mapAccountSummary } from "./account.mapper";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import type { AccountSummaryDTO } from "../dtos/account.dto";

const dto: AccountSummaryDTO = { guestAccountId: "own", email: "guest@example.test", active: true,
  profiles: [], linkedReservationsCount: 0, upcomingStay: null };

describe("Real account summary mapper", () => {
  it("represents absence without constructing a profile, tiers or feature counts", () => {
    expect(mapAccountSummary(dto)).toEqual({ source: "real", accountId: "own", email: dto.email, isActive: true,
      profiles: [], profileId: null, linkedReservationsCount: 0, upcomingStay: null });
  });
  it("maps multiple associated profiles without selecting a primary or default language", () => {
    const profiles: AccountSummaryDTO["profiles"] = [
      { profileId: "p1", firstName: "Real", lastName: "Guest", preferredLanguage: null, status: "ACTIVE" },
      { profileId: "p2", firstName: "Another", lastName: "Profile", preferredLanguage: "en", status: "INACTIVE" },
    ];
    const domain = mapAccountSummary({ ...dto, profiles });
    expect(domain.profileId).toBeNull();
    expect(domain.profiles.map(p => p.preferredLanguage)).toEqual([null, "en"]);
  });
  it.each([
    { guestAccountId: "" }, { email: "" }, { active: undefined }, { profiles: null },
    { linkedReservationsCount: -1 }, { linkedReservationsCount: 0.1 }, { upcomingStay: undefined },
  ])("rejects invalid confirmed fields %j", invalid => {
    expect(() => mapAccountSummary({ ...dto, ...invalid } as AccountSummaryDTO)).toThrow(DomainMappingError);
  });
  it("rejects invalid stay dates and inconsistent ownership counts", () => {
    const upcomingStay = { reservationId: "r1", stayId: "s1", confirmationCode: "CONF", arrival: "2026-12-01", departure: "2026-12-03" };
    expect(() => mapAccountSummary({ ...dto, upcomingStay })).toThrow(DomainMappingError);
    expect(() => mapAccountSummary({ ...dto, linkedReservationsCount: 1, upcomingStay: { ...upcomingStay, arrival: "2026-02-30" } })).toThrow(DomainMappingError);
  });
  it("selects known fields only, never storing credential or secondary-feature extras", () => {
    const result = mapAccountSummary({ ...dto, accessToken: "synthetic", rewards_summary: { tier_name: "FAKE" } } as AccountSummaryDTO);
    expect(JSON.stringify(result)).not.toMatch(/Token|synthetic|rewards|FAKE/);
  });
});
