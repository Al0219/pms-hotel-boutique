import type { Room } from "@/modules/rooms";

import { DomainMappingError } from "@/lib/errors";
import type { StaffReservationStayRead } from "../model/staff-reservation-stay-read";

/** Días visibles del Gantt. Fijo en 14 para lectura Staff sin scroll horizontal excesivo. */
export const GANTT_WINDOW_DAYS = 14;

export interface GanttBooking {
  id: string;
  guestName: string;
  stayId: string;
  confirmationCode: string;
  status: StaffReservationStayRead["reservationStatus"];
  travelState: StaffReservationStayRead["travelState"];
  /** Primer día visible de la estadía dentro de la ventana. */
  isStart: boolean;
  /** Último día visible de la estadía dentro de la ventana. */
  isEnd: boolean;
}

export interface GanttCell {
  date: Date;
  dayKey: string;
  bookings: GanttBooking[];
}

export interface GanttRow {
  key: string;
  label: string;
  detail: string | null;
  roomStatus: Room["status"] | null;
  cells: GanttCell[];
}

export interface GanttGrid {
  days: Date[];
  rows: GanttRow[];
  /** Inventario físico; no representa disponibilidad vendible ni limpieza. */
  physicalRooms: number;
  /** Por día visible: habitaciones con estadías RESERVED/IN_HOUSE de padre no cancelado. */
  occupiedPerDay: number[];
}

export function toDayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Ventana de días consecutivos a partir del inicio (ambos a granularidad de día). */
export function buildDateWindow(start: Date, length: number = GANTT_WINDOW_DAYS): Date[] {
  const first = startOfDay(start);
  return Array.from({ length }, (_, index) => {
    const day = new Date(first);
    day.setDate(first.getDate() + index);
    return day;
  });
}

/** Proyecta cada stay por roomId y fechas de calendario [arrival, departure). */
export function buildGanttGrid(
  rooms: ReadonlyArray<Room>,
  stays: ReadonlyArray<StaffReservationStayRead>,
  days: ReadonlyArray<Date>,
  propertyId: string,
): GanttGrid {
  if (rooms.some(room => room.propertyId !== propertyId) || stays.some(stay => stay.propertyId !== propertyId)) {
    throw new DomainMappingError("CALENDAR_PROPERTY_MISMATCH");
  }
  const byRoomId = new Map(rooms.map(room => [room.id, room]));
  const cellsByRow = new Map<string, GanttCell[]>();
  const rowMeta = new Map<string, { label: string; detail: string | null; roomStatus: Room["status"] | null }>();

  const ensureRow = (key: string, meta: { label: string; detail: string | null; roomStatus: Room["status"] | null }) => {
    if (!cellsByRow.has(key)) {
      cellsByRow.set(
        key,
        days.map((date) => ({ date, dayKey: toDayKey(date), bookings: [] })),
      );
      rowMeta.set(key, meta);
    }
    return cellsByRow.get(key) as GanttCell[];
  };

  for (const room of [...rooms].sort((a, b) => a.number.localeCompare(b.number, "es", { numeric: true }))) {
    ensureRow(`room:${room.id}`, {
      label: room.number,
      detail: room.roomTypeLabel,
      roomStatus: room.status,
    });
  }

  const unassigned = ensureRow("unassigned", {
    label: "Sin asignar",
    detail: "Estadías sin habitación asignada",
    roomStatus: null,
  });

  const occupyingPerDay = new Map<string, Set<string>>();

  for (const stay of stays) {
    const room = stay.roomId === null ? null : byRoomId.get(stay.roomId);
    if (stay.roomId !== null && !room) throw new DomainMappingError("CALENDAR_ROOM_NOT_FOUND");
    const cells = room ? cellsByRow.get(`room:${room.id}`)! : unassigned;
    const occupies = stay.reservationStatus !== "CANCELLED"
      && (stay.travelState === "RESERVED" || stay.travelState === "IN_HOUSE");
    const visibleCells = cells.filter(cell => cell.dayKey >= stay.arrival && cell.dayKey < stay.departure);
    visibleCells.forEach((cell, index) => {
      cell.bookings.push({
        id: stay.reservationId, stayId: stay.stayId, confirmationCode: stay.confirmationCode,
        guestName: stay.guestName ?? "Responsable no registrado",
        status: stay.reservationStatus, travelState: stay.travelState,
        isStart: index === 0, isEnd: index === visibleCells.length - 1,
      });
      if (occupies && room) {
        const occupied = occupyingPerDay.get(cell.dayKey) ?? new Set<string>();
        occupied.add(room.id);
        occupyingPerDay.set(cell.dayKey, occupied);
      }
    });
  }

  const rows: GanttRow[] = [...cellsByRow.entries()].map(([key, cells]) => ({
    key,
    label: (rowMeta.get(key) as { label: string }).label,
    detail: (rowMeta.get(key) as { detail: string | null }).detail,
    roomStatus: (rowMeta.get(key) as { roomStatus: Room["status"] | null }).roomStatus,
    cells,
  }));

  const physicalRooms = rooms.length;
  const occupiedPerDay = days.map((day) => occupyingPerDay.get(toDayKey(day))?.size ?? 0);

  return { days: [...days], rows, physicalRooms, occupiedPerDay };
}
