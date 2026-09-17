"use client";

import { useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";
import { ConfirmDialog } from "@/shared/components";

import { useApplyStayExtension, useExtensionPreview } from "../hooks/use-stay-extension";

import styles from "./stay-extension.module.css";

interface StayExtensionProps {
  /** Must be resolved from the authorized staff session by the composition layer. */
  propertyId: string;
  endpoint: string;
  reservationId: string;
  /** Identifica la ReservationStay que se extiende (la Reservation puede tener N stays). */
  stayId: string;
  onClose: () => void;
}

function formatMoney(amount: number, currency: string): string {
  const symbol = currency.toUpperCase() === "GTQ" ? "Q" : currency;
  return `${symbol}${amount.toLocaleString("en-US")}`;
}

const SHORT_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatDay(date: Date): string {
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function pluralizeNights(count: number): string {
  return `${count} ${count === 1 ? "noche" : "noches"}`;
}

export function StayExtension({ propertyId, endpoint, reservationId, stayId, onClose }: Readonly<StayExtensionProps>) {
  const [draftDeparture, setDraftDeparture] = useState("");
  const [departure, setDeparture] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const preview = useExtensionPreview(propertyId, endpoint, reservationId, stayId, departure ?? undefined);
  const apply = useApplyStayExtension(propertyId, endpoint, reservationId, stayId);

  const currency = preview.data?.currency ?? "GTQ";
  const showDialog = confirming && departure !== null && !apply.isError && preview.data !== undefined;

  function handleRevalidate() {
    if (!draftDeparture.trim()) {
      return;
    }
    setDeparture(draftDeparture);
  }

  function handleConfirm() {
    if (departure) {
      apply.mutate({ newDeparture: departure, reason: reason.trim() || null });
    }
  }

  return (
    <section className={styles.panel} aria-label="Extender estadía">
      <header className={styles.header}>
        <h2>Extender estadía</h2>
        <p className={styles.reference}>Reserva {preview.data?.reservationId ?? reservationId} · Estadía {stayId}</p>
      </header>

      {apply.isSuccess && apply.data ? (
        <div className={styles.success} role="status">
          <strong>Extensión registrada</strong>
          <p>
            Salida actualizada: {formatDay(apply.data.previousDeparture)} →{" "}
            {formatDay(apply.data.newDeparture)} · {pluralizeNights(apply.data.extraNights)} adicionales.
          </p>
          <p>{apply.data.auditSummary}.</p>
          <p>{apply.data.message}.</p>
          <button className={styles.primaryButton} type="button" onClick={onClose}>Cerrar</button>
        </div>
      ) : (
        <>
          {preview.isLoading ? <p className={styles.stateLine} aria-busy="true">Revalidando disponibilidad y tarifa…</p> : null}

          {!preview.isLoading && preview.error ? (
            <div className={styles.error} role="alert">
              <strong>{preview.error instanceof HttpNetworkError ? "Sin conexión." : "No se pudieron consultar las opciones de extensión."}</strong>
              <p>La extensión no puede confirmarse sin un preview válido.</p>
              <button className={styles.linkButton} type="button" onClick={() => void preview.refetch()}>Reintentar</button>
            </div>
          ) : null}

          <div className={styles.dateRow}>
            <label className={styles.dateField}>
              <span>Nueva fecha de salida</span>
              <input
                type="date"
                value={draftDeparture}
                min={preview.data ? minDepartureDay(preview.data.currentStay.checkOut) : undefined}
                onChange={(event) => setDraftDeparture(event.target.value)}
              />
            </label>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={handleRevalidate}
              disabled={!draftDeparture.trim() || apply.isPending}
            >
              Revalidar disponibilidad
            </button>
          </div>

          {preview.data ? (
            <>
              <p className={styles.guestLine}>
                {preview.data.guestName} · {preview.data.currentStay.roomLabel} · {preview.data.currentStay.roomType} ·
                salida actual {formatDay(preview.data.currentStay.checkOut)}
              </p>

              <dl className={styles.plan}>
                <div>
                  <dt>Salida solicitada</dt>
                  <dd>{formatDay(preview.data.requestedDeparture)}</dd>
                </div>
                <div>
                  <dt>Noches adicionales</dt>
                  <dd>{pluralizeNights(preview.data.extraNights)}</dd>
                </div>
                <div>
                  <dt>Tarifa validada</dt>
                  <dd>{formatMoney(preview.data.ratePerNight, currency)} / noche{preview.data.rateConfirmed ? " · confirmada" : ""}</dd>
                </div>
                <div>
                  <dt>Cargo adicional</dt>
                  <dd>{formatMoney(preview.data.deltaAmount, currency)}</dd>
                </div>
                <div>
                  <dt>Nuevo total</dt>
                  <dd>{formatMoney(preview.data.newTotalAmount, currency)}</dd>
                </div>
              </dl>

              <div className={styles.context}>
                <strong>Disponibilidad y tarifa</strong>
                <p>{preview.data.availabilityNote ?? "La disponibilidad se valida al confirmar."}</p>
                <p className={styles.muted}>{preview.data.rateConfirmation}.</p>
              </div>

              {preview.data.availabilityConfirmed && (
                <div className={styles.impact}>
                  <strong>Inventario y calendario</strong>
                  <p>{preview.data.inventoryNote ?? "El inventario se actualiza con la nueva salida."}</p>
                  <p className={styles.muted}>{preview.data.calendarNote}.</p>
                </div>
              )}

              {preview.data.folioNote ? (
                <div className={styles.context}>
                  <strong>Folio</strong>
                  <p>{preview.data.folioNote}.</p>
                </div>
              ) : null}

              <label className={styles.reasonField}>
                <span>Motivo de la extensión (opcional)</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Ej. ampliación del evento"
                  aria-label="Motivo de la extensión"
                  rows={2}
                />
              </label>

              {!preview.data.canExtend ? (
                <div className={styles.error} role="status">
                  <strong>No se puede extender la estadía</strong>
                  <p>{preview.data.reason ?? "La política no permite esta acción."}</p>
                  <button className={styles.secondaryButton} type="button" onClick={onClose}>Cerrar</button>
                </div>
              ) : null}
            </>
          ) : null}

          {preview.data?.canExtend && !apply.isError ? (
            <footer className={styles.actions}>
              <button className={styles.secondaryButton} type="button" onClick={onClose} disabled={apply.isPending}>
                Mantener salida actual
              </button>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => setConfirming(true)}
                disabled={apply.isPending || departure === null}
              >
                Confirmar extensión
              </button>
            </footer>
          ) : null}

          {apply.isError ? (
            <div className={styles.error} role="alert">
              <strong>{apply.error instanceof HttpNetworkError ? "Sin conexión." : "No se pudo confirmar la extensión."}</strong>
              <p>La estadía conserva su salida actual. Revalida la disponibilidad antes de reintentar; no se ejecutó ninguna acción.</p>
            </div>
          ) : null}

          {preview.data?.canExtend && apply.isError ? (
            <footer className={styles.actions}>
              <button className={styles.secondaryButton} type="button" onClick={onClose} disabled={apply.isPending}>
                Mantener salida actual
              </button>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => {
                  apply.reset();
                  void preview.refetch();
                }}
              >
                Volver a revalidar
              </button>
            </footer>
          ) : null}
        </>
      )}

      {showDialog && preview.data ? (
        <ConfirmDialog
          title="Confirmar extensión"
          busy={apply.isPending}
          busyLabel="Aplicando…"
          confirmLabel="Confirmar extensión"
          body={
            <p>
              La salida <strong>{formatDay(preview.data.currentStay.checkOut)}</strong> pasará a{" "}
              <strong>{formatDay(preview.data.requestedDeparture)}</strong> ·{" "}
              {pluralizeNights(preview.data.extraNights)} adicionales · cargo{" "}
              <strong>{formatMoney(preview.data.deltaAmount, currency)}</strong>. La disponibilidad de las{" "}
              {preview.data.extraNights} noches se revalida nuevamente en el momento de confirmar. La estadía conserva su
              ID y el folio con sus cargos; se agrega el cargo por las noches adicionales.
              {reason.trim() ? <><br />Motivo: <strong>{reason.trim()}</strong>.</> : null}
            </p>
          }
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </section>
  );
}

function minDepartureDay(checkOut: Date): string {
  const dayAfter = new Date(checkOut);
  dayAfter.setDate(dayAfter.getDate() + 1);
  return dayAfter.toLocaleDateString("en-CA");
}