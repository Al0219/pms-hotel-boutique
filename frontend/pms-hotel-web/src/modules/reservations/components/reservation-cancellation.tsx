"use client";

import { useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";
import { ConfirmDialog } from "@/shared/components";

import { useApplyCancellation, useCancellationPreview } from "../hooks/use-reservation-cancellation";
import type { CancellationPreview } from "../model/reservation-cancellation";

import styles from "./reservation-cancellation.module.css";

interface ReservationCancellationProps {
  /** Must be resolved from the authorized staff session by the composition layer. */
  propertyId: string;
  endpoint: string;
  reservationId: string;
  onClose: () => void;
}

function formatMoney(amount: number, currency: string): string {
  const symbol = currency.toUpperCase() === "GTQ" ? "Q" : currency;
  return `${symbol}${amount.toLocaleString("en-US")}`;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("es-GT", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).replace(".", "");
}

function PolicyBlock({ preview }: Readonly<{ preview: CancellationPreview }>) {
  return (
    <div className={styles.policy}>
      <strong>Política aplicable</strong>
      <p>{preview.policySummary}</p>
      {preview.cutoffAt ? (
        <p className={styles.muted}>Cutoff: {formatDateTime(preview.cutoffAt)}.</p>
      ) : null}
      <p className={styles.muted}>La política usada es el snapshot guardado al confirmar la reserva.</p>
    </div>
  );
}

function FinancialBlock({ preview, currency }: Readonly<{ preview: CancellationPreview; currency: string }>) {
  return (
    <dl className={styles.financial}>
      <div>
        <dt>Penalización</dt>
        <dd>{formatMoney(preview.penaltyAmount, currency)}</dd>
      </div>
      <div>
        <dt>Reembolso estimado</dt>
        <dd>{formatMoney(preview.refundAmount, currency)}</dd>
      </div>
    </dl>
  );
}

export function ReservationCancellation({ propertyId, endpoint, reservationId, onClose }: Readonly<ReservationCancellationProps>) {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const preview = useCancellationPreview(propertyId, endpoint, reservationId, true);
  const apply = useApplyCancellation(propertyId, endpoint, reservationId);

  const currency = "GTQ";
  const showDialog = confirming && !apply.isError;

  return (
    <section className={styles.panel} aria-label="Cancelar reserva">
      <header className={styles.header}>
        <h2>Cancelar reserva</h2>
        <p className={styles.reference}>Reserva {preview.data?.reservationId ?? reservationId}</p>
      </header>

      {apply.isSuccess && apply.data ? (
        <div className={styles.success} role="status">
          <strong>Cancelación completada</strong>
          <p>{apply.data.message}</p>
          <p className={styles.muted}>
            {formatMoney(apply.data.penaltyAmount, currency)} de penalización · reembolso {formatMoney(apply.data.refundAmount, currency)} · inventario liberado.
          </p>
          <button className={styles.primaryButton} type="button" onClick={onClose}>Cerrar</button>
        </div>
      ) : (
        <>
          {preview.isLoading ? <p className={styles.stateLine} aria-busy="true">Consultando política de cancelación…</p> : null}

          {!preview.isLoading && preview.error ? (
            <div className={styles.error} role="alert">
              <strong>{preview.error instanceof HttpNetworkError ? "Sin conexión." : "No se pudo consultar la política de cancelación."}</strong>
              <p>La cancelación no puede confirmarse sin un preview válido.</p>
              <button className={styles.linkButton} type="button" onClick={() => void preview.refetch()}>Reintentar</button>
            </div>
          ) : null}

          {!preview.isLoading && !preview.error && preview.data ? (
            <>
              {!preview.data.canCancel ? (
                <div className={styles.error} role="status">
                  <strong>La reserva no se puede cancelar</strong>
                  <p>{preview.data.reason ?? "La política no permite la cancelación de esta reserva."}</p>
                  <button className={styles.secondaryButton} type="button" onClick={onClose}>Cerrar</button>
                </div>
              ) : (
                <>
                  <PolicyBlock preview={preview.data} />
                  <FinancialBlock preview={preview.data} currency={currency} />
                  {preview.data.releaseNote ? <p className={styles.release}>Inventario: {preview.data.releaseNote}.</p> : null}
                  <p className={styles.muted}>Se cobrará al método de garantía autorizado.</p>
                </>
              )}
            </>
          ) : null}

          {preview.data?.canCancel ? (
            <footer className={styles.actions}>
              <button className={styles.secondaryButton} type="button" onClick={onClose} disabled={apply.isPending}>
                Volver
              </button>
              <button className={styles.primaryButtonDestructive} type="button" onClick={() => setConfirming(true)} disabled={apply.isPending}>
                Cancelar reserva
              </button>
            </footer>
          ) : null}

          {apply.isError ? (
            <div className={styles.error} role="alert">
              <strong>{apply.error instanceof HttpNetworkError ? "Sin conexión." : "No se pudo cancelar la reserva."}</strong>
              <p>La reserva conserva su estado. Revalida la política antes de reintentar; no se ejecutó ninguna cancelación.</p>
            </div>
          ) : null}

          {preview.data?.canCancel && apply.isError ? (
            <footer className={styles.actions}>
              <button className={styles.secondaryButton} type="button" onClick={onClose} disabled={apply.isPending}>
                Volver
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
          title="Confirmar cancelación"
          destructive
          busy={apply.isPending}
          busyLabel="Cancelando…"
          confirmLabel="Confirmar cancelación"
          body={
            <>
              <p>
                <strong>{reservationId}</strong> pasará a <strong>CANCELADA</strong> y se aplicará{" "}
                <strong>{formatMoney(preview.data.penaltyAmount, currency)}</strong> antes de liberar el inventario.
              </p>
              <label className={styles.reasonField}>
                Motivo de cancelación
                <input
                  type="text"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Cambio de planes del huésped"
                />
                <span className={styles.muted}>Obligatorio · se registra en AuditTrail con política e importe.</span>
              </label>
            </>
          }
          confirmDisabled={reason.trim() === ""}
          onConfirm={() => apply.mutate(reason.trim())}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </section>
  );
}