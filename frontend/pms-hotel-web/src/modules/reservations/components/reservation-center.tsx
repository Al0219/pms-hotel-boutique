"use client";

import Link from "next/link";

import { HttpNetworkError } from "@/lib/http/errors";

import { useReservationCenter } from "../hooks/use-reservation-center";
import type { ReservationAlertItem } from "../model/reservation-summary";
import { ReservationList } from "./reservation-list";
import styles from "./reservation-center.module.css";

const ALERT_KINDS: Record<string, string> = {
  NO_SHOW_PENDING: styles.alertError,
  GUARANTEE_EXPIRING: styles.alertWarning,
  WAITLIST_QUEUE: styles.alertInfo,
  OTA_MODIFICATION: styles.alertService,
};

interface ReservationCenterProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Reservation Center contract. */
  endpoint?: string;
}

function KpiCard({ label, value, detail }: Readonly<{ label: string; value: number; detail?: string }>) {
  return (
    <div className={styles.kpi}>
      <p className={styles.kpiLabel}>{label}</p>
      <strong className={styles.kpiValue}>{value}</strong>
      {detail ? <p className={styles.kpiDetail}>{detail}</p> : null}
    </div>
  );
}

function AlertsPanel({ alerts }: Readonly<{ alerts: ReadonlyArray<ReservationAlertItem> }>) {
  return (
    <section className={styles.alerts} aria-labelledby="reservation-alerts-title">
      <h2 id="reservation-alerts-title">Alertas de reservas</h2>
      <ul className={styles.alertList}>
        {alerts.map((alert) => (
          <li key={alert.id} className={styles.alertItem}>
            <span className={`${styles.alertDot} ${ALERT_KINDS[alert.kind] ?? styles.alertNeutral}`} aria-hidden="true" />
            <span>{alert.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReservationCenter({ propertyId, endpoint }: Readonly<ReservationCenterProps>) {
  const { data: center, error, isLoading, refetch } = useReservationCenter(propertyId, endpoint);

  if (!propertyId) {
    return <section className={styles.page} role="status"><h1>Centro de Reservas</h1><p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar reservas.</p></section>;
  }

  if (!endpoint) {
    return <section className={styles.page} role="status"><h1>Centro de Reservas</h1><p>El centro de reservas estará disponible al confirmar el contrato API con Backend.</p></section>;
  }

  if (isLoading) {
    return <section className={styles.page} aria-busy="true"><p>Cargando reservas…</p></section>;
  }

  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudieron cargar las reservas."
      : "No se pudieron cargar las reservas.";

    return (
      <section className={styles.page} role="alert">
        <h1>Centro de Reservas</h1>
        <p>{message}</p>
        <button className={styles.retryButton} type="button" onClick={() => void refetch()}>Reintentar</button>
      </section>
    );
  }

  if (!center?.reservations.length) {
    return <section className={styles.page}><h1>Centro de Reservas</h1><p>No hay reservas para esta propiedad.</p></section>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1>Centro de Reservas</h1>
          <p className={styles.subtitle}>Estados, alertas y acciones de todas las reservas de la propiedad en una sola vista.</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.secondaryAction} href="/calendario">Ver calendario</Link>
          <button className={styles.primaryAction} type="button" disabled title="El flujo de creación de reservas se implementa por separado.">+ Nueva reserva</button>
        </div>
      </header>

      <div className={styles.kpis} aria-label="Resumen del día">
        <KpiCard label="Llegadas hoy" value={center.summary.arrivalsToday} />
        <KpiCard
          label="Salidas hoy"
          value={center.summary.departuresToday}
          detail={`${center.summary.vipToday} VIP · ${center.summary.multiRoomToday} multi-room · ${center.summary.lateCheckoutToday} late check-out`}
        />
        <KpiCard label="Alertas" value={center.summary.alerts} />
        <KpiCard
          label="Confirmadas próximas"
          value={center.summary.confirmedNextDays}
          detail={`próximos 7 días · ${center.summary.decisionsRequired} requieren decisión`}
        />
      </div>

      <AlertsPanel alerts={center.alerts} />
      <ReservationList reservations={center.reservations} />
    </div>
  );
}