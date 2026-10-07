import { describe, expect, it } from "vitest";
import { mapAvailabilityResponseToDomain } from "@/modules/availability";
import { publicCatalogueFixture } from "@/data/mocks/public-catalogue";
import { catalogueOptions, changeSelectionQuantity, clearCatalogueFilters, roomSelection, resolveSelection, selectionTotals } from "./room-catalogue";

const rooms = mapAvailabilityResponseToDomain(publicCatalogueFixture).roomTypes;
describe("Room catalogue rules", () => {
  it("combines filters and preserves source recommendation order", () => {
    expect(catalogueOptions(rooms, {}, clearCatalogueFilters(), "recommended").map(item => item.room.name)).toEqual(["Deluxe King", "Suite Terraza", "Doble Superior", "Junior Suite"]);
    expect(catalogueOptions(rooms, {}, { categories: ["SUITE"], capacity: 4, prices: ["middle"] }, "recommended").map(item => item.room.name)).toEqual(["Junior Suite"]);
    expect(catalogueOptions(rooms, {}, { categories: ["DELUXE"], capacity: 4, prices: [] }, "recommended")).toEqual([]);
  });
  it("sorts price and capacity without mutating API data", () => {
    expect(catalogueOptions(rooms, {}, clearCatalogueFilters(), "price-asc").map(item => item.rate.baseNightlyRate)).toEqual([125, 145, 175, 210]);
    expect(catalogueOptions(rooms, {}, clearCatalogueFilters(), "price-desc").map(item => item.rate.baseNightlyRate)).toEqual([210, 175, 145, 125]);
    expect(catalogueOptions(rooms, {}, clearCatalogueFilters(), "capacity")[0].room.name).toBe("Junior Suite");
    expect(rooms[0].name).toBe("Deluxe King");
  });
  it.each([[150, "low"], [150.01, "middle"], [180, "middle"], [180.01, "high"]] as const)("classifies price %s without gaps between ranges", (price, band) => {
    const room = { ...rooms[0], ratePlans: [{ ...rooms[0].ratePlans[0], baseNightlyRate: price }] };
    expect(catalogueOptions([room], {}, { ...clearCatalogueFilters(), prices: [band] }, "recommended")).toHaveLength(1);
  });
  it("does not convert foreign currency or guess absent categories", () => {
    const room = { ...rooms[0], category: undefined, ratePlans: [{ ...rooms[0].ratePlans[0], currency: "EUR" }] };
    expect(catalogueOptions([room], {}, { ...clearCatalogueFilters(), prices: ["low"] }, "recommended")).toEqual([]);
    expect(catalogueOptions([room], {}, { ...clearCatalogueFilters(), categories: ["DELUXE"] }, "recommended")).toEqual([]);
  });
  it("uses the selected rate and the server stay quote rather than multiplying the nightly rate", () => {
    const room = { ...rooms[0], ratePlans: [{ ...rooms[0].ratePlans[1], baseNightlyRate: 130, totalAmount: 350.25 }] };
    expect(catalogueOptions([room], { [room.roomTypeId]: room.ratePlans[0].ratePlanId }, clearCatalogueFilters(), "recommended")[0].rate.totalAmount).toBe(350.25);
    const selected = resolveSelection([{ roomTypeId: room.roomTypeId, ratePlanId: room.ratePlans[0].ratePlanId, quantity: 2 }], [room]);
    expect(selectionTotals(selected)).toEqual([{ currency: "USD", amount: 700.5 }]);
  });
  it("invalidates selection after an ATS reduction or disappearing rate", () => {
    const selected = [{ roomTypeId: rooms[0].roomTypeId, ratePlanId: rooms[0].ratePlans[0].ratePlanId, quantity: 2 }];
    expect(resolveSelection(selected, [{ ...rooms[0], availableRoomsCount: 1 }])[0].valid).toBe(false);
    expect(resolveSelection(selected, [{ ...rooms[0], ratePlans: [] }])[0].valid).toBe(false);
    expect(selectionTotals(resolveSelection(selected, []))).toEqual([]);
  });
  it("keeps currencies separate and avoids floating point drift", () => {
    const usd = { ...rooms[0], ratePlans: [{ ...rooms[0].ratePlans[0], totalAmount: .1 }] };
    const eur = { ...rooms[1], ratePlans: [{ ...rooms[1].ratePlans[0], currency: "EUR", totalAmount: .2 }] };
    const selection = [usd, eur].map(room => ({ roomTypeId: room.roomTypeId, ratePlanId: room.ratePlans[0].ratePlanId, quantity: 1 }));
    expect(selectionTotals(resolveSelection(selection, [usd, eur]))).toEqual([{ currency: "USD", amount: .1 }, { currency: "EUR", amount: .2 }]);
  });
});

describe('Real catalogue presentation and quantities', () => {
  it('filters exact codes and minor prices, sorts and preserves source', () => {
    const real = rooms.slice(0, 3).map((room, index) => ({ ...room, code: ['STD', 'DLX', 'SUITE'][index], ratePlans: [{ ...room.ratePlans[0], nightlyRateMinor: [65000, 85000, 120000][index], baseNightlyRate: [650, 850, 1200][index], currency: 'GTQ' }] }));
    const snapshot = structuredClone(real);
    expect(catalogueOptions(real, {}, { ...clearCatalogueFilters(), codes: ['STD'], maxNightlyMinor: 65000 }, 'price-asc').map(value => value.room.code)).toEqual(['STD']);
    expect(catalogueOptions(real, {}, { ...clearCatalogueFilters(), maxNightlyMinor: 64999 }, 'name')).toEqual([]);
    expect(catalogueOptions(real, {}, clearCatalogueFilters(), 'price-desc').map(value => value.room.code)).toEqual(['SUITE', 'DLX', 'STD']);
    expect(catalogueOptions(real, {}, clearCatalogueFilters(), 'name').map(value => value.room.name)).toEqual(['Deluxe King', 'Doble Superior', 'Suite Terraza']);
    expect(real).toEqual(snapshot);
  });
});


it('keeps quantities within ATS, removes zero and retains authoritative IDs and quote', () => {
  const room = { ...rooms[0], roomTypeId: '6d681515-3e7f-4bfe-89ab-05e002d9d23b', availableRoomsCount: 2, code: 'DLX' };
  const rate = { ...room.ratePlans[0], ratePlanId: 'DEMO_DELUXE', ratePlanCode: 'DEMO_DELUXE', currency: 'GTQ', nightlyRateMinor: 85000, totalMinor: 170000 };
  const selection = [roomSelection(room, rate)];
  const twice = changeSelectionQuantity(selection, [room], room.roomTypeId, 2);
  expect(twice).toEqual([{ roomTypeId: room.roomTypeId, roomTypeCode: 'DLX', roomTypeName: room.name, availableUnits: 2, ratePlanId: 'DEMO_DELUXE', ratePlanCode: 'DEMO_DELUXE', quantity: 2, currency: 'GTQ', nightlyRateMinor: 85000, totalMinor: 170000 }]);
  for (const value of [-1, 3, 1.5, NaN]) expect(changeSelectionQuantity(twice, [room], room.roomTypeId, value)).toBe(twice);
  expect(changeSelectionQuantity(twice, [room], room.roomTypeId, 1)[0].quantity).toBe(1);
  expect(changeSelectionQuantity(selection, [room], room.roomTypeId, 0)).toEqual([]);
});
