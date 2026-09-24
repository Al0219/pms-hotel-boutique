import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { initializeAccountFixture, resetAccountFixtures } from "@/data/mocks/account-fixtures";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { mapGuestReservations } from "./guest-reservation.mapper";
import { mapInvoices } from "./invoice.mapper";
import { mapRewardsProgram } from "@/modules/rewards";
import { mapPromotion } from "@/modules/promotions";
import { getGuestProfile, updateGuestProfile } from "@/modules/profile";
import { getStayHistory } from "../service/account.service";

beforeEach(() => { resetAccountFixtures(); vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true"); });
afterEach(() => vi.unstubAllEnvs());

describe("Public 05 read contracts", () => {
  it("preserves a multi-room reservation without flattening it into two reservations", async () => {
    initializeAccountFixture("guest-demo-01", "demo@example.com");
    const data = mapGuestReservations(await getStayHistory("guest-demo-01"), "guest-demo-01");
    expect(data).toHaveLength(4);
    expect(data[0].stays).toHaveLength(2);
    expect(data[0].id).toBe("HB-2026-09117");
    expect(data[0].stays[1].occupants[0].name).not.toBe(data[0].bookingGuest);
    expect(data[1].statusCode).toBe("CONFIRMED");
    expect(data[1].stays[0].statusCode).toBe("CHECKED_OUT");
  });
  it("rejects another account, duplicate stay IDs and invalid dates", () => {
    const fixture = initializeAccountFixture("guest-demo-01", "demo@example.com");
    const dto = { account_id: fixture.accountId, reservations: fixture.reservations };
    expect(() => mapGuestReservations(dto, "other-account")).toThrow(DomainMappingError);
    const duplicate = structuredClone(dto);
    duplicate.reservations[0].stays[1].stay_id = duplicate.reservations[0].stays[0].stay_id;
    expect(() => mapGuestReservations(duplicate, fixture.accountId)).toThrow(DomainMappingError);
    const malformed = structuredClone(dto);
    malformed.reservations[0].stays[0].arrival = "2026-02-30";
    expect(() => mapGuestReservations(malformed, fixture.accountId)).toThrow(DomainMappingError);
  });
  it("keeps the received reward balance, rejects invalid values and preserves movement types", () => {
    const { rewards } = initializeAccountFixture("guest-demo-01", "demo@example.com");
    expect(mapRewardsProgram({ ...rewards, points_balance: 999 }).pointsBalance).toBe(999);
    expect(mapRewardsProgram(rewards).ledger?.map(entry => entry.type)).toEqual(["EARN", "REDEEM", "EXPIRE", "REVERSE"]);
    expect(() => mapRewardsProgram({ ...rewards, points_balance: -1 })).toThrow(DomainMappingError);
    expect(() => mapRewardsProgram({ ...rewards, ledger: [{ ...rewards.ledger![0], type: "UNKNOWN" as "EARN" }] })).toThrow(DomainMappingError);
  });
  it("preserves promotion rejection reasons and rejects invalid validity ranges", () => {
    const promo = initializeAccountFixture("guest-demo-01", "demo@example.com").promotions[1];
    expect(mapPromotion(promo)).toMatchObject({ isEligible: false, combinable: false, combinationReason: "Incompatible con MEMBER5." });
    expect(() => mapPromotion({ ...promo, valid_until: "2025-01-01" })).toThrow(DomainMappingError);
    expect(() => mapPromotion({ ...promo, discount_percentage: 101 })).toThrow(DomainMappingError);
  });
  it("does not accept another account's profile and never mutates account credentials or privacy fields", async () => {
    const fixture = initializeAccountFixture("guest-demo-01", "access@example.com");
    const original = fixture.profile;
    await expect(getGuestProfile(original.profile_id, "guest-demo-empty")).rejects.toThrow();
    const saved = await updateGuestProfile({ ...original, first_name: "Ana", email: "contact@example.com", preferences: { ...original.preferences, privacy_level: "PUBLIC", revocable_consent: false } }, fixture.accountId);
    expect(saved.first_name).toBe("Ana");
    expect(saved.preferences.privacy_level).toBe("SOLO CUENTA");
    expect(saved.preferences.revocable_consent).toBe(true);
    expect(fixture.accessEmail).toBe("access@example.com");
    expect((await getGuestProfile(original.profile_id, fixture.accountId)).email).toBe("contact@example.com");
  });
  it("rejects unsafe document URLs and unlinked-account documents", () => {
    const fixture = initializeAccountFixture("guest-demo-01", "demo@example.com");
    const dto = { account_id: fixture.accountId, invoices: fixture.invoices };
    expect(mapInvoices(dto, fixture.accountId)[0].downloadPath).toBeNull();
    expect(() => mapInvoices(dto, "another-account")).toThrow(DomainMappingError);
    expect(() => mapInvoices({ ...dto, invoices: [{ ...dto.invoices[0], download_path: "javascript:alert(1)" }] }, fixture.accountId)).toThrow(DomainMappingError);
  });
});
