"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";
import { useRooms } from "@/modules/rooms";

import { useReservationCenter } from "../hooks/use-reservation-center";
import type { ReservationStatus } from "../model/reservation-summary";
import {
  buildDateWindow,
  buildGanttGrid,
  GANTT_WINDOW_DAYS,
} from "./calendar-gantt-model";

import styles from "./calendar-gantt.module.css";

const STATUS_BADGE: Record<ReservationStatus, string> = {
  CONFIRMED: styles.bookingConfirmed,
  PENDING: styles.bookingPending,
  WAITLIST: styles.bookingWaitlist,
  NO_SHOW_PENDING: styles.bookingNoShow,
  NO_SHOW: styles.bookingNoShow,
  CANCELLED: styles.bookingCancelled,
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  CONFIRMED: "Confirmada",
  PENDING: "Pendiente",
  WAITLIST: "Waitlist",
  NO_SHOW_PENDING: "No-show pendiente",
  NO_SHOW: "No-show",
  CANCELLED: "Cancelada",
};

interface CalendarGanttProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Reservation Center contract. */
  reservationsEndpoint?: string;
  /** Must be supplied only after Backend approves the provisional Rooms contract. */
  roomsEndpoint?: string;
}

function formatDayHeader(date: Date): { day: string; weekday: string } {
  const day = date.toLocaleDateString("es-GT", { day: "numeric", month: "short" }).replace(".", "");
  const weekday = date.toLocaleDateString("es-GT", { weekday: "short" }).replace(".", "");
  return { day, weekday };
}

function occupancyLabel(occupied: number, sellable: number): string {
  if (sellable === 0) {
    return "—";
  }
  const percent = Math.round((occupied / sellable) * 100);
  return `${occupied}/${sellable} · ${percent}%`;
}

export function CalendarGantt({ propertyId, reservationsEndpoint, roomsEndpoint }: Readonly<CalendarGanttProps>) {
  const [windowStart, setWindowStart] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });

  const centerQuery = useReservationCenter(propertyId, reservationsEndpoint);
  const roomsQuery = useRooms(propertyId, roomsEndpoint);

  const days = useMemo(() => buildDateWindow(windowStart, GANTT_WINDOW_DAYS), [windowStart]);
  const grid = useMemo(() => {
    if (!centerQuery.data || !roomsQuery.data) {
      return null;
    }
    return buildGanttGrid(roomsQuery.data, centerQuery.data.reservations, days);
  }, [centerQuery.data, roomsQuery.data, days]);

  if (!propertyId) {
    return <section className={styles.page} role="status"><h1>Calendario</h1><p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar el calendario.</p></section>;
  }

  if (!reservationsEndpoint || !roomsEndpoint) {
    return <section className={styles.page} role="status"><h1>Calendario</h1><p>El calendario estará disponible al confirmar los contratos API con Backend.</p></section>;
  }

  if (centerQuery.isLoading || roomsQuery.isLoading) {
    return <section className={styles.page} aria-busy="true"><h1>Calendario</h1><p>Cargando calendario…</p></section>;
  }

  const error = centerQuery.error ?? roomsQuery.error;
  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudo cargar el calendario."
      : "No se pudo cargar el calendario.";
    return (
      <section className={styles.page} role="alert">
        <h1>Calendario</h1>
        <p>{message}</p>
        <button
          className={styles.retryButton}
          type="button"
          onClick={() => {
            void centerQuery.refetch();
            void roomsQuery.refetch();
          }}
        >
          Reintentar
        </button>
      </section>
    );
  }

  if (!grid || grid.rows.length === 0) {
    return <section className={styles.page}><h1>Calendario</h1><p>No hay habitaciones para esta propiedad.</p></section>;
  }

  const moveWindow = (direction: -1 | 0 | 1) => {
    if (direction === 0) {
      const today = new Date();
      setWindowStart(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
      return;
    }
    const next = new Date(windowStart);
    next.setDate(windowStart.getDate() + direction * GANTT_WINDOW_DAYS);
    setWindowStart(next);
  };

  const firstDay = formatDayHeader(grid.days[0]);
  const lastDay = formatDayHeader(grid.days[grid.days.length - 1]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1>Calendario</h1>
          <p className={styles.subtitle}>
            Ocupación por habitación del {firstDay.day} al {lastDay.day} · {grid.sellableRooms} habitaciones vendibles.
          </p>
        </div>
        <div className={styles.headerActions} role="group" aria-label="Navegación temporal">
          <button className={styles.navButton} type="button" onClick={() => moveWindow(-1)} aria-label="Ventana anterior">
            ‹
          </button>
          <button className={styles.navButton} type="button" onClick={() => moveWindow(0)}>
            Hoy
          </button>
          <button className={styles.navButton} type="button" onClick={() => moveWindow(1)} aria-label="Ventana siguiente">
            ›
          </button>
        </div>
      </header>

      <div className={styles.gridScroll}>
        <table className={styles.grid}>
          <caption className={styles.caption}>
            Gantt de ocupación: habitaciones en filas y días en columnas. Cada reserva enlaza a su detalle.
          </caption>
          <thead>
            <tr>
              <th scope="col" className={styles.roomHeader}>Habitación</th>
              {grid.days.map((day) => {
                const { day: label, weekday } = formatDayHeader(day);
                return (
                  <th key={day.toISOString()} scope="col" className={styles.dayHeader}>
                    <span className={styles.dayLabel}>{label}</span>
                    <span className={styles.weekdayLabel}>{weekday}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className={styles.roomCell}>
                  <strong>{row.label}</strong>
                  {row.detail ? <span className={styles.roomDetail}>{row.detail}</span> : null}
                  {row.roomStatus && row.roomStatus !== "ACTIVE" ? (
                    <span className={styles.roomStatus}>{row.roomStatus === "OOO" ? "Fuera de orden" : "Fuera de servicio"}</span>
                  ) : null}
                </th>
                {row.cells.map((cell) => (
                  <td key={cell.dayKey} className={styles.dayCell}>
                    {cell.bookings.map((booking) => (
                      <Link
                        key={booking.id}
                        className={`${styles.booking} ${STATUS_BADGE[booking.status]}`}
                        href={`/reservas/${encodeURIComponent(booking.id)}`}
                        title={`${booking.id} · ${booking.guestName} · ${STATUS_LABELS[booking.status]}`}
                      >
                        {booking.isStart ? booking.guestName : "···"}
                      </Link>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row" className={styles.roomCell}>
                <strong>Ocupación</strong>
              </th>
              {grid.occupiedPerDay.map((occupied, index) => (
                <td key={grid.days[index].toISOString()} className={styles.occupancyCell}>
                  {occupancyLabel(occupied, grid.sellableRooms)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
