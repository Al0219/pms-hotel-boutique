"use client";

import { HttpNetworkError } from "@/lib/http/errors";

import { useConfirmWaitlistConversion, useWaitlistConversionPreview } from "../hooks/use-waitlist-conversion";
import type { WaitlistConversionPreview } from "../model/waitlist";

import styles from "./waitlist-conversion-panel.module.css";

interface WaitlistConversionPanelProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId: string;
  endpoint: string;
  waitlistId: string;
  onClose: () => void;
}

function formatMoney(amount: number, currency: string): string {
  const symbol = currency.toUpperCase() === "GTQ" ? "Q" : currency;
  return `${symbol}${amount.toLocaleString("en-US")}`;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("es-GT", { day: "numeric", month: "short" }).replace(".", "");
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function EntrySummary({ preview }: Readonly<{ preview: WaitlistConversionPreview }>) {
  return (
    <dl className={styles.entrySummary}>
      <div className={styles.entryRow}>
        <dt>Huésped</dt>
        <dd>{preview.guestName}</dd>
      </div>
      <div className={styles.entryRow}>
        <dt>Estadía</dt>
        <dd>
          {formatShortDate(preview.checkIn)} → {formatShortDate(preview.checkOut)} · {pluralize(preview.nights, "noche", "noches")} · {pluralize(preview.adults, "adulto", "adultos")}
        </dd>
      </div>
      <div className={styles.entryRow}>
        <dt>Habitación</dt>
        <dd>{preview.roomTypeLabel} · {preview.sourceLabel}</dd>
      </div>
      <div className={styles.entryRow}>
        <dt>Cola</dt>
        <dd>Prioridad {preview.priority} · {preview.queueLabel}</dd>
      </div>
      <div className={styles.entryRow}>
        <dt>Preferencias conservadas</dt>
        <dd>{preview.preferences ?? "—"}</dd>
      </div>
      <div className={styles.entryRow}>
        <dt>Tarifa estimada original</dt>
        <dd>{formatMoney(preview.originalEstimatedAmount, "GTQ")} · se conservan fechas, ocupación y origen</dd>
      </div>
    </dl>
  );
}

function AvailabilityBlock({ preview, onRevalidate }: Readonly<{ preview: WaitlistConversionPreview; onRevalidate: () => void }>) {
  if (!preview.availability) {
    return (
      <div className={styles.availabilityNotFound}>
        <strong>Disponibilidad no encontrada</strong>
        <p>No hay disponibilidad para las fechas solicitadas. La conversión solo puede confirmarse con una revalidación con disponibilidad.</p>
        <button className={styles.linkButton} type="button" onClick={onRevalidate}>Volver a revalidar</button>
      </div>
    );
  }

  const { availability } = preview;

  return (
    <div className={styles.availability}>
      <strong>Disponibilidad encontrada</strong>
      <p>
        {availability.roomType} disponible · {formatShortDate(availability.availableFrom)} – {formatShortDate(availability.availableUntil)}
      </p>
      <p>
        {availability.ratePlan} · {formatMoney(availability.ratePerNight, "GTQ")} / noche
      </p>
      {availability.note ? <p className={styles.muted}>{availability.note}</p> : null}
      <p className={styles.total}><span>Total estimado</span><strong>{formatMoney(availability.totalEstimated, "GTQ")}</strong></p>
    </div>
  );
}

export function WaitlistConversionPanel({ propertyId, endpoint, waitlistId, onClose }: Readonly<WaitlistConversionPanelProps>) {
  const preview = useWaitlistConversionPreview(propertyId, endpoint, waitlistId);
  const conversion = useConfirmWaitlistConversion(propertyId, endpoint, waitlistId);

  const submitDisabled = conversion.isPending || !preview.data?.availability;

  return (
    <section className={styles.panel} aria-label="Convertir a reserva">
      <header className={styles.header}>
        <h2>Convertir a reserva</h2>
        <p className={styles.reference}>Solicitud {preview.data?.id ?? waitlistId}</p>
      </header>

      {conversion.isSuccess && conversion.data ? (
        <div className={styles.success} role="status">
          <strong>{conversion.data.waitlistId} → {conversion.data.reservationId} · Convertida</strong>
          <p>{conversion.data.message}</p>
          <button className={styles.primaryButton} type="button" onClick={onClose}>Cerrar</button>
        </div>
      ) : (
        <>
          {preview.isLoading ? <p className={styles.stateLine} aria-busy="true">Revalidando disponibilidad y tarifa…</p> : null}

          {!preview.isLoading && preview.error ? (
            <div className={styles.error} role="alert">
              <strong>{preview.error instanceof HttpNetworkError ? "Sin conexión." : "No se pudo revalidar la solicitud."}</strong>
              <p>Reintenta la revalidación antes de decidir.</p>
              <button className={styles.linkButton} type="button" onClick={() => void preview.refetch()}>Volver a revalidar</button>
            </div>
          ) : null}

          {!preview.isLoading && !preview.error && preview.data ? (
            <>
              <EntrySummary preview={preview.data} />
              <AvailabilityBlock preview={preview.data} onRevalidate={() => void preview.refetch()} />
            </>
          ) : null}

          {conversion.isError ? (
            <div className={styles.error} role="alert">
              <strong>{conversion.error instanceof HttpNetworkError ? "Sin conexión." : "No se pudo convertir la reserva."}</strong>
              <p>La disponibilidad o tarifa pudieron cambiar. Revalida antes de reintentar; no se creó ninguna reserva.</p>
            </div>
          ) : null}

          <footer className={styles.actions}>
            <button className={styles.secondaryButton} type="button" onClick={onClose} disabled={conversion.isPending}>
              Mantener en waitlist
            </button>
            {conversion.isError ? (
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => {
                  conversion.reset();
                  void preview.refetch();
                }}
                disabled={conversion.isPending}
              >
                Volver a revalidar
              </button>
            ) : (
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => conversion.mutate()}
                disabled={submitDisabled}
              >
                {conversion.isPending ? "Convirtiendo…" : "Convertir a reserva"}
              </button>
            )}
          </footer>
        </>
      )}
    </section>
  );
}