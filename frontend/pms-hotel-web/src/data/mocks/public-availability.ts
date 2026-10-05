import type { AvailabilityResponseDto } from "@/modules/availability";

/** PROVISIONAL demo only: flat nightly fixture prices; no production pricing rules. */
export function buildPublicAvailabilityMock(query: URLSearchParams, fixture: AvailabilityResponseDto): AvailabilityResponseDto | undefined {
  const arrival = query.get("check_in_date") ?? "";
  const departure = query.get("check_out_date") ?? "";
  const calendar = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  if (!calendar(arrival) || !calendar(departure) || departure <= arrival) return undefined;
  const nights = (Date.parse(`${departure}T00:00:00Z`) - Date.parse(`${arrival}T00:00:00Z`)) / 86400000;
  const validCount = (key: string, min: number) => {
    const value = query.get(key) ?? "";
    return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) >= min;
  };
  if (!validCount("adults", 1) || !validCount("children", 0) || !validCount("rooms_count", 1)) return undefined;
  const roomsCount = Number(query.get("rooms_count"));
  const totalAts = fixture.available_room_types.reduce((total, room) => total + room.available_rooms_count, 0);
  return {
    ...fixture,
    check_in_date: arrival,
    check_out_date: departure,
    total_nights: nights,
    // A reservation can mix RoomTypes. Do not assign its occupants to every type.
    // This static fixture is not a real inventory or admission calculation.
    available_room_types: roomsCount > totalAts ? [] : fixture.available_room_types.map(room => ({
        ...room,
        rate_plans: room.rate_plans.map(rate => {
          const roomMinor = Math.round(Number(rate.base_nightly_rate) * 100) * nights;
          const original = rate.stay_price_breakdown;
          // Scale the approved illustrative stay estimate; not production fees/taxes.
          const serviceMinor = original ? Math.round(Number(original.service_charge) * 100 * nights / fixture.total_nights) : 0;
          const taxMinor = original ? Math.round(Number(original.estimated_taxes) * 100 * nights / fixture.total_nights) : 0;
          return { ...rate, total_amount: (roomMinor / 100).toFixed(2),
            ...(original ? { stay_price_breakdown: {
              service_charge: (serviceMinor / 100).toFixed(2), estimated_taxes: (taxMinor / 100).toFixed(2),
              estimated_total: ((roomMinor + serviceMinor + taxMinor) / 100).toFixed(2),
            } } : {}),
          };
        }),
      })),
  };
}
