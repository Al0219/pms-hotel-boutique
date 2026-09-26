import { describe, expect, it } from "vitest";
import { mapStaffIdentity } from "../modules/auth/mappers/staff-session.mapper";
import { initialStaffIdentity } from "@/data/mocks/private-09";
import { resolvePropertyScope } from "@/modules/properties";
import { calculateMetrics, consolidateMetrics, stayDates } from "../modules/multi-property/model/portfolio";
import { mapPortfolio, mapComparison } from "../modules/multi-property/mappers/portfolio.mapper";

const staff = () => ({ ...mapStaffIdentity(initialStaffIdentity()), roleName: "Gerencia", permissions: ["MULTI_PROPERTY_READ"] });
describe("Private 09 scope and presentation", () => {
  it("resolves only ACTIVE memberships and never falls back to global", () => {
    const session = staff(); session.memberships[1].active = false;
    expect(resolvePropertyScope(session, "GT-HB-03")).toBeNull();
    expect(resolvePropertyScope(session, "unknown")).toBeNull();
    expect(resolvePropertyScope(session, "ALL_PROPERTIES")).toEqual({ kind: "ALL_PROPERTIES", propertyIds: ["GT-HB-01"] });
    expect(session.roleId).toBe("gerencia");
  });
  it("denies global to Reception without MULTI_PROPERTY_READ and empty memberships", () => {
    const session = staff(); session.roleId = "recepcion"; session.permissions = [];
    expect(resolvePropertyScope(session, "ALL_PROPERTIES")).toBeNull();
    expect(resolvePropertyScope(session, "GT-HB-01")?.kind).toBe("PROPERTY");
    session.memberships = [];
    expect(resolvePropertyScope(session, "GT-HB-01")).toBeNull();
  });
  it.each(["status", "currency", "timezone"])("rejects malformed membership %s", field => {
    const dto = initialStaffIdentity();
    Object.assign(dto.memberships[0], { [field]: "invalid" });
    expect(() => mapStaffIdentity(dto)).toThrow();
  });
  it("rejects duplicate memberships and invalid identity", () => {
    const dto = initialStaffIdentity(); dto.memberships.push(dto.memberships[0]);
    expect(() => mapStaffIdentity(dto)).toThrow();
    expect(() => mapStaffIdentity(null)).toThrow();
  });
  it("weights consolidated metrics instead of averaging percentages", () => {
    const rows = [
      calculateMetrics({ propertyId: "A", currency: "GTQ", date: "2026-09-08", roomsSold: 1, roomsAvailable: 10, revenue: 100 }),
      calculateMetrics({ propertyId: "B", currency: "GTQ", date: "2026-09-08", roomsSold: 90, roomsAvailable: 100, revenue: 18000 }),
    ];
    const [total] = consolidateMetrics(rows);
    expect(total.revenue).toBe(18100); expect(total.occupancy).toBeCloseTo(91 / 110 * 100);
    expect(total.adr).toBeCloseTo(18100 / 91);
    expect(rows[0].roomsSold).toBe(1);
  });
  it("does not consolidate different currencies or periods and handles zero denominators", () => {
    const row = calculateMetrics({ propertyId: "A", currency: "GTQ", date: "2026-09-08", roomsSold: 0, roomsAvailable: 0, revenue: 0 });
    expect(row.adr).toBeNull(); expect(row.occupancy).toBeNull(); expect(row.revpar).toBeNull();
    expect(consolidateMetrics([row, { ...row, currency: "USD" }, { ...row, date: "2026-09-09" }])).toHaveLength(3);
    expect(consolidateMetrics([])).toEqual([]);
  });
  it("rejects out-of-scope or duplicate metrics instead of displaying them", () => {
    const row = { property_id: "GT-HB-01", currency: "GTQ", date: "2026-09-08", sold_room_nights: 82, available_room_nights: 100, net_revenue: "92250.00" };
    expect(mapPortfolio({ metrics: [row] }, ["GT-HB-01"])[0].adr).toBe(1125);
    expect(() => mapPortfolio({ metrics: [row] }, ["GT-HB-03"])).toThrow();
    expect(() => mapPortfolio({ metrics: [row, row] }, ["GT-HB-01"])).toThrow();
    expect(() => mapPortfolio({ metrics: [{ ...row, net_revenue: "NaN" }] }, ["GT-HB-01"])).toThrow();
  });
  it("validates date ranges and daily coverage before presenting stay ATS", () => {
    const criteria = { startDate: "2026-09-12", endDate: "2026-09-14", roomType: "" };
    expect(stayDates(criteria)).toEqual(["2026-09-12", "2026-09-13"]);
    expect(stayDates({ ...criteria, endDate: criteria.startDate })).toEqual([]);
    const row = { property_id: "GT-HB-01", room_type_id: "king", room_type_name: "King", currency: "GTQ", nightly_rate: "100.00", daily: [{ date: "2026-09-12", ats: 3 }, { date: "2026-09-13", ats: 0 }] };
    expect(mapComparison({ options: [row] }, ["GT-HB-01"], criteria)[0].stayAts).toBe(0);
    expect(() => mapComparison({ options: [{ ...row, daily: row.daily.slice(0, 1) }] }, ["GT-HB-01"], criteria)).toThrow();
    expect(() => mapComparison({ options: [row] }, ["GT-HB-03"], criteria)).toThrow();
  });
});
