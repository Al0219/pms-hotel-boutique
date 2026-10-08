import { describe, expect, it } from "vitest";

import type { Room } from "@/modules/rooms";

import type { ReservationListItem } from "../model/reservation-summary";
import {
  buildDateWindow,
  buildGanttGrid,
  GANTT_WINDOW_DAYS,
  toDayKey,
} from "./calendar-gantt-model";

function room(overrides: Partial<Room> = {}): Room {
  return {
    id: "RM-203",
    propertyId: "GT-HB-01",
    number: "203",
    floor: "2",
    status: "ACTIVE",
    roomTypeLabel: "Deluxe King",
    ...overrides,
  };
}

function reservation(overrides: Partial<ReservationListItem> = {}): ReservationListItem {
  return {
    id: "HB-2026-08421",
    propertyId: "GT-HB-01",
    guestName: "María López",
    sourceLabel: "Viajes Maya",
    sourceReference: null,
    roomLabel: "203",
    stayStart: new Date(2026, 7, 28),
    stayEnd: new Date(2026, 7, 31),
    nights: 3,
    adults: 2,
    roomCount: 1,
    currency: "GTQ",
    finance: { totalAmount: 3920, paidAmount: 2400, financeState: "BALANCE" },
    alertText: null,
    status: "CONFIRMED",
    statusDetail: null,
    ...overrides,
  };
}

describe("calendar-gantt-model", () => {
  it("builds a 14-day window starting at the given day", () => {
    const days = buildDateWindow(new Date(2026, 7, 28, 15, 30));

    expect(days).toHaveLength(GANTT_WINDOW_DAYS);
    expect(toDayKey(days[0])).toBe("2026-08-28");
    expect(toDayKey(days[13])).toBe("2026-09-10");
  });

  it("assigns a reservation to the room matching its room label", () => {
    const grid = buildGanttGrid(
      [room(), room({ id: "RM-101", number: "101", roomTypeLabel: "Estándar Doble" })],
      [reservation()],
      buildDateWindow(new Date(2026, 7, 28)),
    );

    const roomRow = grid.rows.find((row) => row.key === "room:RM-203");
    expect(roomRow?.cells.filter((cell) => cell.bookings.length > 0)).toHaveLength(3);
    expect(roomRow?.cells[0].bookings[0]).toMatchObject({ id: "HB-2026-08421", isStart: true, isEnd: false });
    expect(roomRow?.cells[2].bookings[0]).toMatchObject({ id: "HB-2026-08421", isStart: false, isEnd: true });

    const otherRow = grid.rows.find((row) => row.key === "room:RM-101");
    expect(otherRow?.cells.every((cell) => cell.bookings.length === 0)).toBe(true);
  });

  it("treats the checkout day as exclusive", () => {
    const grid = buildGanttGrid(
      [room()],
      [reservation()],
      buildDateWindow(new Date(2026, 7, 28)),
    );

    const roomRow = grid.rows.find((row) => row.key === "room:RM-203");
    const checkoutCell = roomRow?.cells.find((cell) => cell.dayKey === "2026-08-31");
    expect(checkoutCell?.bookings).toHaveLength(0);
  });

  it("collects active reservations without a matching room in the unassigned row", () => {
    const grid = buildGanttGrid(
      [room()],
      [reservation({ id: "WAIT-0007", roomLabel: "Deluxe King", status: "WAITLIST" })],
      buildDateWindow(new Date(2026, 7, 28)),
    );

    const unassigned = grid.rows.find((row) => row.key === "unassigned");
    expect(unassigned?.cells.filter((cell) => cell.bookings.length > 0)).toHaveLength(3);
    expect(grid.occupiedPerDay.every((occupied) => occupied === 0)).toBe(true);
  });

  it("counts occupancy only from inventory-occupying states and active rooms", () => {
    const grid = buildGanttGrid(
      [room(), room({ id: "RM-103", number: "103", status: "OOO" })],
      [
        reservation(),
        reservation({ id: "HB-2026-08055", roomLabel: "103", status: "CANCELLED" }),
      ],
      buildDateWindow(new Date(2026, 7, 28)),
    );

    expect(grid.sellableRooms).toBe(1);
    expect(grid.occupiedPerDay[0]).toBe(1);
    expect(grid.occupiedPerDay[3]).toBe(0);
  });

  it("ignores reservations fully outside the visible window", () => {
    const grid = buildGanttGrid(
      [room()],
      [reservation({ stayStart: new Date(2026, 6, 1), stayEnd: new Date(2026, 6, 3) })],
      buildDateWindow(new Date(2026, 7, 28)),
    );

    expect(grid.rows.every((row) => row.cells.every((cell) => cell.bookings.length === 0))).toBe(true);
  });
});
