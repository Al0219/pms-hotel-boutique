import { describe, expect, it } from "vitest";

import type { Room } from "@/modules/rooms";

import type { StaffReservationStayRead } from "../model/staff-reservation-stay-read";
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

function reservation(overrides: Partial<StaffReservationStayRead> = {}): StaffReservationStayRead {
  return {
    reservationId: "HB-2026-08421", stayId: "stay-1", confirmationCode: "HB-08421",
    propertyId: "GT-HB-01", guestName: "María López", roomId: "RM-203",
    roomType: "Deluxe", arrival: "2026-08-28", departure: "2026-08-31",
    reservationStatus: "CONFIRMED", travelState: "RESERVED", ...overrides,
  };
}

describe("calendar-gantt-model", () => {
  it("sorts room codes naturally ascending, keeps unassigned last and preserves source data", () => {
    const rooms = Object.freeze(["203", "10", "2", "A10", "A2", "101"].map(number =>
      room({ id: `RM-${number}`, number }),
    ));
    const stays = Object.freeze([reservation(), reservation({ stayId: "unassigned-stay", roomId: null })]);
    const originalRooms = structuredClone(rooms);
    const originalStays = structuredClone(stays);
    const grid = buildGanttGrid(rooms, stays, buildDateWindow(new Date(2026, 7, 28)), "GT-HB-01");

    expect(grid.rows.map(row => row.label)).toEqual(["2", "10", "101", "203", "A2", "A10", "Sin asignar"]);
    expect(grid.rows.find(row => row.key === "room:RM-203")?.cells[0].bookings[0]).toMatchObject({ stayId: "stay-1" });
    expect(grid.rows.at(-1)?.cells[0].bookings[0]).toMatchObject({ stayId: "unassigned-stay" });
    expect(grid.physicalRooms).toBe(6);
    expect(grid.occupiedPerDay.slice(0, 4)).toEqual([1, 1, 1, 0]);
    expect(rooms).toEqual(originalRooms);
    expect(stays).toEqual(originalStays);
  });

  it("builds a 14-day window starting at the given day", () => {
    const days = buildDateWindow(new Date(2026, 7, 28, 15, 30));

    expect(days).toHaveLength(GANTT_WINDOW_DAYS);
    expect(toDayKey(days[0])).toBe("2026-08-28");
    expect(toDayKey(days[13])).toBe("2026-09-10");
  });

  it("assigns a reservation to the room matching its room ID", () => {
    const grid = buildGanttGrid(
      [room(), room({ id: "RM-101", number: "101", roomTypeLabel: "Estándar Doble" })],
      [reservation()],
      buildDateWindow(new Date(2026, 7, 28)), "GT-HB-01",
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
      buildDateWindow(new Date(2026, 7, 28)), "GT-HB-01",
    );

    const roomRow = grid.rows.find((row) => row.key === "room:RM-203");
    const checkoutCell = roomRow?.cells.find((cell) => cell.dayKey === "2026-08-31");
    expect(checkoutCell?.bookings).toHaveLength(0);
  });

  it("collects active reservations without a matching room in the unassigned row", () => {
    const grid = buildGanttGrid(
      [room()],
      [reservation({ stayId: "unassigned-stay", roomId: null })],
      buildDateWindow(new Date(2026, 7, 28)), "GT-HB-01",
    );

    const unassigned = grid.rows.find((row) => row.key === "unassigned");
    expect(unassigned?.cells.filter((cell) => cell.bookings.length > 0)).toHaveLength(3);
    expect(grid.occupiedPerDay.every((occupied) => occupied === 0)).toBe(true);
  });

  it("counts assigned active stays against physical inventory", () => {
    const grid = buildGanttGrid(
      [room(), room({ id: "RM-103", number: "103", status: "OOO" })],
      [
        reservation(),
        reservation({ stayId: "cancelled-stay", roomId: "RM-103", reservationStatus: "CANCELLED" }),
      ],
      buildDateWindow(new Date(2026, 7, 28)), "GT-HB-01",
    );

    expect(grid.physicalRooms).toBe(2);
    expect(grid.occupiedPerDay[0]).toBe(1);
    expect(grid.occupiedPerDay[3]).toBe(0);
  });

  it("ignores reservations fully outside the visible window", () => {
    const grid = buildGanttGrid(
      [room()],
      [reservation({ arrival: "2026-07-01", departure: "2026-07-03" })],
      buildDateWindow(new Date(2026, 7, 28)), "GT-HB-01",
    );

    expect(grid.rows.every((row) => row.cells.every((cell) => cell.bookings.length === 0))).toBe(true);
  });
});

it("projects N stays separately with independent dates", () => {
  const grid = buildGanttGrid([room()], [reservation(), reservation({ stayId: 'stay-2', roomId: null, arrival: '2026-08-30', departure: '2026-09-02' })], buildDateWindow(new Date(2026, 7, 28)), 'GT-HB-01');
  expect(grid.rows[0].cells[0].bookings[0].stayId).toBe('stay-1');
  expect(grid.rows[1].cells[0].bookings).toHaveLength(0);
  expect(grid.rows[1].cells[2].bookings[0]).toMatchObject({ stayId: 'stay-2', id: 'HB-2026-08421' });
});
it.each(['CANCELLED', 'NO_SHOW', 'CHECKED_OUT'] as const)('displays %s without counting occupancy', travelState => {
  const grid = buildGanttGrid([room()], [reservation({ travelState })], buildDateWindow(new Date(2026, 7, 28)), 'GT-HB-01');
  expect(grid.rows[0].cells[0].bookings[0].travelState).toBe(travelState);
  expect(grid.occupiedPerDay[0]).toBe(0);
});
it('preserves conflicts and counts IN_HOUSE without inventing room status', () => {
  const grid = buildGanttGrid([room({ status: null })], [reservation({ travelState: 'IN_HOUSE' }), reservation({ stayId: 'stay-2' })], buildDateWindow(new Date(2026, 7, 28)), 'GT-HB-01');
  expect(grid.rows[0].cells[0].bookings).toHaveLength(2);
  expect(grid.occupiedPerDay[0]).toBe(1);
  expect(grid.rows[0].roomStatus).toBeNull();
});
it('rejects foreign scope and unknown assigned rooms', () => {
  const days = buildDateWindow(new Date(2026, 7, 28));
  expect(() => buildGanttGrid([room()], [reservation({ propertyId: 'other' })], days, 'GT-HB-01')).toThrow('CALENDAR_PROPERTY_MISMATCH');
  expect(() => buildGanttGrid([room({ propertyId: 'other' })], [], days, 'GT-HB-01')).toThrow('CALENDAR_PROPERTY_MISMATCH');
  expect(() => buildGanttGrid([room()], [reservation({ roomId: 'unknown' })], days, 'GT-HB-01')).toThrow('CALENDAR_ROOM_NOT_FOUND');
});
