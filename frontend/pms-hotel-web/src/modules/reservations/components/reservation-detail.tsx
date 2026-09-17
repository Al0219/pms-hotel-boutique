"use client";

import { useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";

import { useReservationDetail } from "../hooks/use-reservation-detail";
import type { ReservationDetailData, ReservationStayDetail, StayTravelState } from "../model/reservation-detail";
import type { ReservationStatus } from "../model/reservation-summary";
import { ReservationCancellation } from "./reservation-cancellation";
import { ReservationNoShow } from "./reservation-no-show";

import styles from "./reservation-detail.module.css";

const STATUS_LABELS: Record<ReservationStatus, string> = {
  CONFIRMED: "Confirmada",
  PENDING: "Pendiente",
  WAITLIST: "Waitlist",
  NO_SHOW_PENDING: "No-show pendiente",
  NO_SHOW: "No-show",
  CANCELLED: "Cancelada",
};

const STATUS_BADGE: Record<ReservationStatus, string> = {
  CONFIRMED: styles.statusConfirmed,
  PENDING: styles.statusPending,
  WAITLIST: styles.statusWaitlist,
  NO_SHOW_PENDING: styles.statusNoShow,
  NO_SHOW: styles.statusNoShow,
  CANCELLED: styles.statusCancelled,
};

const TRAVEL_STATE_LABELS: Record<StayTravelState, string> = {
  RESERVED: "Reservada",
  IN_HOUSE: "En casa",
  CHECKED_OUT: "Salida",
  CANCELLED: "Cancelada",
  NO_SHOW: "No-show",
};

function formatMoney(amount: number, currency: string): string {
  const symbol = currency.toUpperCase() === "GTQ" ? "Q" : currency;
  return `${symbol}${amount.toLocaleString("en-US")}`;
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" }).replace(".", "");
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("es-GT", { day: "numeric", month: "short" }).replace(".", "");
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function occupancyLabel(detail: ReservationDetailData): string {
  const { guest } = detail;
  const base = pluralize(guest.adults, "adulto", "adultos");

  if (guest.children === null) {
    return base;
  }

  return `${base} · ${pluralize(guest.children, "niño", "niños")}`;
}

function paymentLine(detail: ReservationDetailData): string {
  const { currency, finance } = detail;

  switch (finance.financeState) {
    case "ESTIMATED":
      return `Tarifa estimada ${formatMoney(finance.totalAmount, currency)}`;
    case "PAID":
      return "Pagado";
    case "BALANCE": {
      const pending = finance.paidAmount === null ? 0 : Math.max(finance.totalAmount - finance.paidAmount, 0);
      return `Pendiente ${formatMoney(pending, currency)}`;
    }
    case "DEPOSIT":
      return `Depósito ${formatMoney(finance.paidAmount ?? 0, currency)}`;
    case "NO_CAPTURE":
      return "Sin captura";
  }
}

function StayBlock({ stay, singleRoom }: Readonly<{ stay: ReservationStayDetail; singleRoom: boolean }>) {
  return (
    <div className={styles.stayItem}>
      <p className={styles.stayRoom}>{stay.roomLabel} · {stay.roomType}</p>
      <p className={styles.stayMeta}>
        {formatShortDate(stay.checkIn)} → {formatShortDate(stay.checkOut)} · {pluralize(stay.nights, "noche", "noches")}
      </p>
      {!singleRoom ? <p className={styles.stayMeta}>{TRAVEL_STATE_LABELS[stay.travelState]}</p> : null}
    </div>
  );
}

interface ReservationDetailProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Reservation Detail contract. */
  endpoint?: string;
  reservationId?: string;
}

export function ReservationDetail({ propertyId, endpoint, reservationId }: Readonly<ReservationDetailProps>) {
  const { data: detail, error, isLoading, refetch } = useReservationDetail(propertyId, endpoint, reservationId);
  const [cancelling, setCancelling] = useState(false);
  const [markingNoShow, setMarkingNoShow] = useState(false);

  const title = reservationId ? `Reserva ${reservationId}` : "Detalle de reserva";

  if (!propertyId) {
    return <section className={styles.page} role="status"><h1>{title}</h1><p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar la reserva.</p></section>;
  }

  if (!endpoint) {
    return <section className={styles.page} role="status"><h1>{title}</h1><p>El detalle de reserva estará disponible al confirmar el contrato API con Backend.</p></section>;
  }

  if (!reservationId) {
    return <section className={styles.page} role="status"><h1>{title}</h1><p>Selecciona una reserva para ver su detalle.</p></section>;
  }

  if (isLoading) {
    return <section className={styles.page} aria-busy="true"><p>Cargando detalle de la reserva…</p></section>;
  }

  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudo cargar el detalle de la reserva."
      : "No se pudo cargar el detalle de la reserva.";

    return (
      <section className={styles.page} role="alert">
        <h1>{title}</h1>
        <p>{message}</p>
        <button className={styles.retryButton} type="button" onClick={() => void refetch()}>Reintentar</button>
      </section>
    );
  }

  if (!detail) {
    return <section className={styles.page} role="status"><h1>{title}</h1><p>No se encontró la reserva solicitada.</p></section>;
  }

  const singleRoom = detail.stays.length === 1;
  const reference = detail.source.reference ? ` · ${detail.source.reference}` : "";
  const cancellable = detail.status === "CONFIRMED" || detail.status === "PENDING";
  const noShowPending = detail.status === "NO_SHOW_PENDING";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1>{title}</h1>
          <p className={styles.subtitle}>
            <span className={`${styles.badge} ${STATUS_BADGE[detail.status]}`}>{STATUS_LABELS[detail.status]}</span>
          </p>
          <p className={styles.origin}>Origen: {detail.source.label}{reference} · Creada {formatLongDate(detail.createdAt)}</p>
          {cancellable ? (
            <button
              className={styles.cancelAction}
              type="button"
              onClick={() => setCancelling(true)}
              disabled={cancelling}
            >
              Cancelar reserva
            </button>
          ) : null}
          {noShowPending ? (
            <button
              className={styles.cancelAction}
              type="button"
              onClick={() => setMarkingNoShow(true)}
              disabled={markingNoShow}
            >
              Marcar no-show
            </button>
          ) : null}
        </div>
      </header>

      {cancelling && propertyId && endpoint && reservationId ? (
        <ReservationCancellation
          propertyId={propertyId}
          endpoint={endpoint}
          reservationId={reservationId}
          onClose={() => setCancelling(false)}
        />
      ) : null}

      {markingNoShow && propertyId && endpoint && reservationId ? (
        <ReservationNoShow
          propertyId={propertyId}
          endpoint={endpoint}
          reservationId={reservationId}
          onClose={() => setMarkingNoShow(false)}
        />
      ) : null}

      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="reservation-data-title">
          <h2 id="reservation-data-title">Datos de la reserva</h2>
          <dl className={styles.definitionList}>
            {singleRoom && (
              <>
                <div className={styles.definitionRow}>
                  <dt>Check-in</dt>
                  <dd>{formatLongDate(detail.stays[0].checkIn)}</dd>
                </div>
                <div className={styles.definitionRow}>
                  <dt>Check-out</dt>
                  <dd>{formatLongDate(detail.stays[0].checkOut)}</dd>
                </div>
              </>
            )}
            <div className={styles.definitionRow}>
              <dt>{singleRoom ? "Habitación" : "Habitaciones"}</dt>
              <dd>
                <StayBlock stay={detail.stays[0]} singleRoom={singleRoom} />
                {detail.stays.slice(1).map((stay) => (
                  <StayBlock key={stay.id} stay={stay} singleRoom={false} />
                ))}
              </dd>
            </div>
            <div className={styles.definitionRow}>
              <dt>Huésped principal</dt>
              <dd>{detail.guest.primaryName}</dd>
            </div>
            <div className={styles.definitionRow}>
              <dt>Huéspedes</dt>
              <dd>{occupancyLabel(detail)}</dd>
            </div>
            <div className={styles.definitionRow}>
              <dt>Teléfono</dt>
              <dd>{detail.guest.phone ?? "—"}</dd>
            </div>
            <div className={styles.definitionRow}>
              <dt>Tarifa</dt>
              <dd>{formatMoney(detail.finance.ratePerNight, detail.currency)} / noche</dd>
            </div>
            <div className={styles.definitionRow}>
              <dt>Política aplicable</dt>
              <dd>{detail.policyLabel}</dd>
            </div>
            <div className={styles.definitionRow}>
              <dt>Notas / solicitudes especiales</dt>
              <dd>{detail.notes ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.card} aria-labelledby="reservation-finance-title">
          <h2 id="reservation-finance-title">Resumen financiero</h2>
          <ul className={styles.financeLines}>
            {detail.finance.lines.map((line, index) => (
              <li key={`${line.label}-${index}`}>
                <span>{line.label}</span>
                <strong>{formatMoney(line.amount, detail.currency)}</strong>
              </li>
            ))}
          </ul>
          <p className={styles.totalLine}>
            <span>Total original</span>
            <strong>{formatMoney(detail.finance.totalAmount, detail.currency)}</strong>
          </p>
          <p className={styles.paymentLine}>{paymentLine(detail)}</p>
          <p className={styles.folioHint}>El folio completo se consulta vía el módulo Folio (API pública).</p>
        </section>
      </div>
    </div>
  );
}