"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";
import { useRooms } from "@/modules/rooms";

import { useStaffReservationStays } from "../hooks/use-staff-reservation-stays";
import type { StaffReservationStayRead } from "../model/staff-reservation-stay-read";
import {
  buildDateWindow,
  buildGanttGrid,
  GANTT_WINDOW_DAYS,
} from "./calendar-gantt-model";

import styles from "./calendar-gantt.module.css";

const STATUS_BADGE: Record<StaffReservationStayRead["reservationStatus"], string> = {
  CONFIRMED: styles.bookingConfirmed,
  PENDING: styles.bookingPending,
  CANCELLED: styles.bookingCancelled,
};

const STATUS_LABELS: Record<StaffReservationStayRead["reservationStatus"], string> = {
  CONFIRMED: "Confirmada",
  PENDING: "Pendiente",
  CANCELLED: "Cancelada",
};

const STAY_LABELS: Record<StaffReservationStayRead["travelState"], string> = {
  RESERVED: "Reservada", IN_HOUSE: "En estancia", CHECKED_OUT: "Completada",
  CANCELLED: "Cancelada", NO_SHOW: "No show",
};

interface CalendarGanttProps {
  propertyId: string;
  sessionId: string;
}

function formatDayHeader(date: Date): { day: string; weekday: string } {
  const day = date.toLocaleDateString("es-GT", { day: "numeric", month: "short" }).replace(".", "");
  const weekday = date.toLocaleDateString("es-GT", { weekday: "short" }).replace(".", "");
  return { day, weekday };
}

function occupancyLabel(occupied: number, physical: number): string {
  if (physical === 0) {
    return "—";
  }
  const percent = Math.round((occupied / physical) * 100);
  return `${occupied}/${physical} · ${percent}%`;
}

export function CalendarGantt({ propertyId, sessionId }: Readonly<CalendarGanttProps>) {
  const [windowStart, setWindowStart] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });

  const staysQuery = useStaffReservationStays(propertyId, sessionId);
  const roomsQuery = useRooms(propertyId, "/api/staff/rooms", sessionId);

  const days = useMemo(() => buildDateWindow(windowStart, GANTT_WINDOW_DAYS), [windowStart]);
  const projection = useMemo(() => {
    if (!staysQuery.data || !roomsQuery.data) return { grid: null, error: null };
    try { return { grid: buildGanttGrid(roomsQuery.data, staysQuery.data, days, propertyId), error: null }; }
    catch (error) { return { grid: null, error }; }
  }, [staysQuery.data, roomsQuery.data, days, propertyId]);
  const grid = projection.grid;

  if (staysQuery.isLoading || roomsQuery.isLoading || staysQuery.fetchStatus === "fetching" || roomsQuery.fetchStatus === "fetching") {
    return <section className={styles.page} aria-busy="true"><h1>Calendario</h1><p>Cargando calendario…</p></section>;
  }

  const error = staysQuery.error ?? roomsQuery.error ?? projection.error;
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
            void staysQuery.refetch();
            void roomsQuery.refetch();
          }}
        >
          Reintentar
        </button>
      </section>
    );
  }

  if (!grid || (grid.physicalRooms === 0 && grid.rows.every(row => row.cells.every(cell => cell.bookings.length === 0)))) {
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
            Ocupación por habitación del {firstDay.day} al {lastDay.day} · {grid.physicalRooms} habitaciones físicas.
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
            Gantt de ocupación: habitaciones en filas y días en columnas. Cada estadía enlaza a su detalle.
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
                        key={booking.stayId}
                        className={`${styles.booking} ${booking.status === "CANCELLED" || booking.travelState === "CANCELLED" ? styles.bookingCancelled : booking.travelState === "NO_SHOW" ? styles.bookingNoShow : STATUS_BADGE[booking.status]}`}
                        href={`/reservas/${encodeURIComponent(booking.id)}`}
                        title={`${booking.confirmationCode} · ${booking.guestName} · Reserva ${STATUS_LABELS[booking.status]} · Estadía ${STAY_LABELS[booking.travelState]} · ${row.label}`}
                      >
                        {booking.isStart ? <>{booking.guestName}<br /><small>{STAY_LABELS[booking.travelState]}</small></> : "···"}
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
                  {occupancyLabel(occupied, grid.physicalRooms)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
