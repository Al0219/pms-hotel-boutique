"use client";

import { useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";
import { ConfirmDialog } from "@/shared/components";

import { useApplyNoShow, useNoShowPreview } from "../hooks/use-reservation-no-show";
import type { NoShowPreview } from "../model/reservation-no-show";

import styles from "./reservation-no-show.module.css";

interface ReservationNoShowProps {
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

function PolicyBlock({ preview }: Readonly<{ preview: NoShowPreview }>) {
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

function ChargeBlock({ preview, currency }: Readonly<{ preview: NoShowPreview; currency: string }>) {
  return (
    <dl className={styles.charge}>
      <div>
        <dt>Cargo permitido</dt>
        <dd>{formatMoney(preview.allowedCharge, currency)}</dd>
      </div>
    </dl>
  );
}

export function ReservationNoShow({ propertyId, endpoint, reservationId, onClose }: Readonly<ReservationNoShowProps>) {
  const [confirming, setConfirming] = useState(false);
  const preview = useNoShowPreview(propertyId, endpoint, reservationId, true);
  const apply = useApplyNoShow(propertyId, endpoint, reservationId);

  const currency = "GTQ";
  const showDialog = confirming && !apply.isError;

  return (
    <section className={styles.panel} aria-label="Marcar no-show">
      <header className={styles.header}>
        <h2>Marcar no-show</h2>
        <p className={styles.reference}>Reserva {preview.data?.reservationId ?? reservationId}</p>
      </header>

      {apply.isSuccess && apply.data ? (
        <div className={styles.success} role="status">
          <strong>No-show registrado</strong>
          <p>{apply.data.message}</p>
          <p className={styles.muted}>
            Cargo {formatMoney(apply.data.allowedCharge, currency)} · inventario liberado.
          </p>
          <button className={styles.primaryButton} type="button" onClick={onClose}>Cerrar</button>
        </div>
      ) : (
        <>
          {preview.isLoading ? <p className={styles.stateLine} aria-busy="true">Consultando política de no-show…</p> : null}

          {!preview.isLoading && preview.error ? (
            <div className={styles.error} role="alert">
              <strong>{preview.error instanceof HttpNetworkError ? "Sin conexión." : "No se pudo consultar la política de no-show."}</strong>
              <p>La acción no puede confirmarse sin un preview válido.</p>
              <button className={styles.linkButton} type="button" onClick={() => void preview.refetch()}>Reintentar</button>
            </div>
          ) : null}

          {!preview.isLoading && !preview.error && preview.data ? (
            <>
              {!preview.data.canMarkNoShow ? (
                <div className={styles.error} role="status">
                  <strong>No se puede marcar como no-show</strong>
                  <p>{preview.data.reason ?? "La política no permite esta acción."}</p>
                  <button className={styles.secondaryButton} type="button" onClick={onClose}>Cerrar</button>
                </div>
              ) : (
                <>
                  <PolicyBlock preview={preview.data} />
                  <ChargeBlock preview={preview.data} currency={currency} />
                  {preview.data.releaseNote ? <p className={styles.release}>Inventario: {preview.data.releaseNote}.</p> : null}
                  <p className={styles.muted}>Se cobrará al método de garantía autorizado.</p>
                </>
              )}
            </>
          ) : null}

          {preview.data?.canMarkNoShow ? (
            <footer className={styles.actions}>
              <button className={styles.secondaryButton} type="button" onClick={onClose} disabled={apply.isPending}>
                Volver
              </button>
              <button className={styles.primaryButtonDestructive} type="button" onClick={() => setConfirming(true)} disabled={apply.isPending}>
                Confirmar no-show
              </button>
            </footer>
          ) : null}

          {apply.isError ? (
            <div className={styles.error} role="alert">
              <strong>{apply.error instanceof HttpNetworkError ? "Sin conexión." : "No se pudo registrar el no-show."}</strong>
              <p>La reserva conserva su estado. Revalida la política antes de reintentar; no se ejecutó ninguna acción.</p>
            </div>
          ) : null}

          {preview.data?.canMarkNoShow && apply.isError ? (
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
          title="Confirmar no-show"
          destructive
          busy={apply.isPending}
          busyLabel="Confirmando…"
          confirmLabel="Confirmar no-show"
          body={
            <p>
              <strong>{reservationId}</strong> pasará a <strong>NO_SHOW</strong> y se aplicará{" "}
              <strong>{formatMoney(preview.data.allowedCharge, currency)}</strong> antes de liberar el inventario.
            </p>
          }
          onConfirm={() => apply.mutate()}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </section>
  );
}