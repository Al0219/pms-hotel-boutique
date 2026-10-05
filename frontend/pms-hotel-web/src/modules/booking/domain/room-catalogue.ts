import type { AvailableRoomType, RatePlanOption } from "@/modules/availability";

export type CatalogueSort = "recommended" | "price-asc" | "price-desc" | "capacity";
export type PriceBand = "low" | "middle" | "high";
export interface CatalogueFilters { categories: NonNullable<AvailableRoomType["category"]>[]; capacity: number; prices: PriceBand[] }
export interface CatalogueOption { room: AvailableRoomType; rate: RatePlanOption }
export interface RoomSelection { roomTypeId: string; ratePlanId: string; quantity: number }
export const clearCatalogueFilters = (): CatalogueFilters => ({ categories: [], capacity: 1, prices: [] });

export function catalogueOptions(rooms: AvailableRoomType[], rates: Record<string, string>, filters: CatalogueFilters, sort: CatalogueSort): CatalogueOption[] {
  const options = rooms.flatMap(room => {
    const rate = room.ratePlans.find(value => value.ratePlanId === rates[room.roomTypeId]) ?? room.ratePlans[0];
    if (!rate || room.availableRoomsCount <= 0 || room.maxOccupancy < filters.capacity) return [];
    if (filters.categories.length && (!room.category || !filters.categories.includes(room.category))) return [];
    const band: PriceBand = rate.baseNightlyRate <= 150 ? "low" : rate.baseNightlyRate <= 180 ? "middle" : "high";
    // USD thresholds do not imply an exchange rate for other currencies.
    if (filters.prices.length && (rate.currency !== "USD" || !filters.prices.includes(band))) return [];
    return [{ room, rate }];
  });
  return options.sort((a, b) => sort === "capacity" ? b.room.maxOccupancy - a.room.maxOccupancy :
    sort === "recommended" ? 0 : a.rate.currency.localeCompare(b.rate.currency) ||
    (sort === "price-asc" ? a.rate.baseNightlyRate - b.rate.baseNightlyRate : b.rate.baseNightlyRate - a.rate.baseNightlyRate));
}

/** Resolve against the latest response; never retain an obsolete quote or ATS. */
export function resolveSelection(selection: RoomSelection[], rooms: AvailableRoomType[]) {
  return selection.map(item => {
    const room = rooms.find(value => value.roomTypeId === item.roomTypeId);
    const rate = room?.ratePlans.find(value => value.ratePlanId === item.ratePlanId);
    return { ...item, room, rate, valid: Boolean(room && rate && Number.isSafeInteger(item.quantity) && item.quantity > 0 && item.quantity <= room.availableRoomsCount) };
  });
}

/** Sum server stay quotes in minor units, keeping currencies separate. */
export function selectionTotals(items: ReturnType<typeof resolveSelection>): { currency: string; amount: number }[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (!item.valid || !item.rate) continue;
    const { currency, totalAmount } = item.rate;
    const digits = new Intl.NumberFormat("es", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
    const factor = 10 ** digits;
    const minor = Math.round(totalAmount * factor) * item.quantity;
    const total = (totals.get(currency) ?? 0) + minor;
    if (!Number.isSafeInteger(total)) throw new Error("SELECTION_TOTAL_TOO_LARGE");
    totals.set(currency, total);
  }
  return [...totals].map(([currency, minor]) => {
    const digits = new Intl.NumberFormat("es", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
    return { currency, amount: minor / 10 ** digits };
  });
}

export function catalogueMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es", { style: "currency", currency }).format(amount);
}
