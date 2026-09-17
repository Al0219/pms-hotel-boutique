"use client";

import { useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";

import { ConfirmDialog } from "./confirm-dialog";
import { useApplyRoomMove, useRoomMovePreview } from "../hooks/use-room-move";
import type { RoomMoveCandidate, RoomMovePreview } from "../model/room-move";

import styles from "./room-move.module.css";

interface RoomMoveProps {
  /** Must be resolved from the authorized staff session by the composition layer. */
  propertyId: string;
  endpoint: string;
  reservationId: string;
  /** Identifica la ReservationStay que se mueve (la Reservation puede tener N stays). */
  stayId: string;
  onClose: () => void;
}

function formatMoney(amount: number, currency: string): string {
  const symbol = currency.toUpperCase() === "GTQ" ? "Q" : currency;
  return `${symbol}${amount.toLocaleString("en-US")}`;
}

function selectedRoom(preview: RoomMovePreview, selectedRoomId: string): RoomMoveCandidate | undefined {
  return preview.candidates.find((candidate) => candidate.roomId === selectedRoomId);
}

function FinanceSummary({ preview, currency }: Readonly<{ preview: RoomMovePreview; currency: string }>) {
  const { financeSummary } = preview;

  return (
    <dl className={styles.finance}>
      <div>
        <dt>Total actual</dt>
        <dd>
          {formatMoney(financeSummary.totalAmount, currency)} · {financeSummary.totalCount}{" "}
          {financeSummary.totalCount === 1 ? "cargo" : "cargos"}
        </dd>
      </div>
      <div>
        <dt>Pagado</dt>
        <dd>
          {formatMoney(financeSummary.paidAmount, currency)} · {financeSummary.paidCount}{" "}
          {financeSummary.paidCount === 1 ? "pago" : "pagos"}
        </dd>
      </div>
      <div>
        <dt>Saldo pendiente</dt>
        <dd>{formatMoney(financeSummary.balanceAmount, currency)}</dd>
      </div>
    </dl>
  );
}

function CandidateRow({
  candidate,
  selected,
  onSelect,
  disabled,
}: Readonly<{ candidate: RoomMoveCandidate; selected: boolean; onSelect: () => void; disabled: boolean }>) {
  return (
    <label className={`${styles.candidate} ${selected ? styles.candidateSelected : ""}`}>
      <input
        type="radio"
        name="room-move-candidate"
        checked={selected}
        onChange={onSelect}
        disabled={disabled}
      />
      <span className={styles.candidateBody}>
        <strong>
          {candidate.roomLabel} · {candidate.roomType}
        </strong>
        <span className={candidate.isCompatible ? styles.compatible : styles.incompatible}>
          {candidate.isCompatible
            ? `Compatibilidad: ${candidate.compatibilityNote ?? "compatible"} · PASS`
            : `Compatibilidad: ${candidate.compatibilityNote ?? "no compatible"} · FAIL`}
        </span>
        <span className={styles.availability}>
          {candidate.availabilityState} {candidate.availabilityNote ? `· ${candidate.availabilityNote}` : ""}
        </span>
      </span>
    </label>
  );
}

export function RoomMove({ propertyId, endpoint, reservationId, stayId, onClose }: Readonly<RoomMoveProps>) {
  const [confirming, setConfirming] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const preview = useRoomMovePreview(propertyId, endpoint, reservationId, stayId, true);
  const apply = useApplyRoomMove(propertyId, endpoint, reservationId, stayId);

  const currency = preview.data?.financeSummary.currency ?? "GTQ";
  const showDialog = confirming && !apply.isError;

  const filteredCandidates = preview.data
    ? preview.data.candidates.filter((candidate) => {
        const query = search.trim().toLowerCase();
        if (!query) {
          return true;
        }
        return `${candidate.roomLabel} ${candidate.roomType}`.toLowerCase().includes(query);
      })
    : [];

  const target = preview.data && selectedRoomId ? selectedRoom(preview.data, selectedRoomId) : undefined;

  function defaultSelection(): string | null {
    if (!preview.data) {
      return null;
    }

    return preview.data.candidates.find((candidate) => candidate.isCompatible)?.roomId ?? null;
  }

  function handleConfirm() {
    if (selectedRoomId) {
      apply.mutate({ targetRoomId: selectedRoomId, reason: reason.trim() || null });
    }
  }

  return (
    <section className={styles.panel} aria-label="Cambiar habitación">
      <header className={styles.header}>
        <h2>Cambiar habitación</h2>
        <p className={styles.reference}>Reserva {preview.data?.reservationId ?? reservationId} · Estadía {stayId}</p>
      </header>

      {apply.isSuccess && apply.data ? (
        <div className={styles.success} role="status">
          <strong>Cambio de habitación registrado</strong>
          <p>{apply.data.auditSummary}.</p>
          <p>{apply.data.message}.</p>
          <button className={styles.primaryButton} type="button" onClick={onClose}>Cerrar</button>
        </div>
      ) : (
        <>
          {preview.isLoading ? <p className={styles.stateLine} aria-busy="true">Consultando opciones de cambio de habitación…</p> : null}

          {!preview.isLoading && preview.error ? (
            <div className={styles.error} role="alert">
              <strong>{preview.error instanceof HttpNetworkError ? "Sin conexión." : "No se pudieron consultar las opciones de cambio de habitación."}</strong>
              <p>El cambio no puede confirmarse sin un preview válido.</p>
              <button className={styles.linkButton} type="button" onClick={() => void preview.refetch()}>Reintentar</button>
            </div>
          ) : null}

          {!preview.isLoading && !preview.error && preview.data ? (
            <>
              <p className={styles.guestLine}>
                {preview.data.guestName} · estancia activa · Hab. {preview.data.currentRoom.roomLabel} → Hab.{" "}
                {target?.roomLabel ?? "—"}
              </p>
              <FinanceSummary preview={preview.data} currency={currency} />

              <div className={styles.candidatesHeader}>
                <p className={styles.candidatesTitle}>Habitaciones disponibles</p>
                <span className={styles.muted}>La disponibilidad se revalida nuevamente al confirmar.</span>
              </div>
              <input
                className={styles.search}
                type="search"
                placeholder="Buscar en esta vista..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Buscar habitación"
              />
              <div className={styles.candidates} role="radiogroup" aria-label="Habitaciones candidatas">
                {filteredCandidates.length === 0 ? (
                  <p className={styles.stateLine}>No hay habitaciones que coincidan con la búsqueda.</p>
                ) : (
                  filteredCandidates.map((candidate) => (
                    <CandidateRow
                      key={candidate.roomId}
                      candidate={candidate}
                      selected={candidate.roomId === selectedRoomId}
                      disabled={!candidate.isCompatible || !candidate.availabilityState}
                      onSelect={() => setSelectedRoomId(candidate.roomId)}
                    />
                  ))
                )}
              </div>
              {selectedRoomId === null && filteredCandidates.length > 0 ? (
                <button className={styles.linkButton} type="button" onClick={() => setSelectedRoomId(defaultSelection())}>
                  Seleccionar habitación compatible sugerida
                </button>
              ) : null}

              <div className={styles.context}>
                <strong>Folio y tarifa</strong>
                <p>{preview.data.folioNote}.</p>
              </div>

              <div className={styles.impact}>
                <strong>Impacto operativo</strong>
                <p>
                  {preview.data.currentRoom.roomLabel} → {preview.data.hkImpact.fromRoomState} ·{" "}
                  {target?.roomLabel ?? "—"} → {preview.data.hkImpact.toRoomState}.
                </p>
                <p className={styles.muted}>{preview.data.hkImpact.note}.</p>
              </div>

              <label className={styles.reasonField}>
                <span>Motivo del cambio (opcional)</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Ej. solicitud de habitación tranquila"
                  aria-label="Motivo del cambio de habitación"
                  rows={2}
                />
              </label>

              {!preview.data.canMove ? (
                <div className={styles.error} role="status">
                  <strong>No se puede cambiar de habitación</strong>
                  <p>{preview.data.reason ?? "La política no permite esta acción."}</p>
                  <button className={styles.secondaryButton} type="button" onClick={onClose}>Cerrar</button>
                </div>
              ) : null}
            </>
          ) : null}

          {preview.data?.canMove && !apply.isError ? (
            <footer className={styles.actions}>
              <button className={styles.secondaryButton} type="button" onClick={onClose} disabled={apply.isPending}>
                Mantener habitación {preview.data.currentRoom.roomLabel}
              </button>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => setConfirming(true)}
                disabled={apply.isPending || selectedRoomId === null}
              >
                Confirmar cambio
              </button>
            </footer>
          ) : null}

          {apply.isError ? (
            <div className={styles.error} role="alert">
              <strong>{apply.error instanceof HttpNetworkError ? "Sin conexión." : "No se pudo confirmar el cambio de habitación."}</strong>
              <p>La estadía conserva su habitación. Revalida la disponibilidad antes de reintentar; no se ejecutó ninguna acción.</p>
            </div>
          ) : null}

          {preview.data?.canMove && apply.isError ? (
            <footer className={styles.actions}>
              <button className={styles.secondaryButton} type="button" onClick={onClose} disabled={apply.isPending}>
                Mantener habitación {preview.data.currentRoom.roomLabel}
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

      {showDialog && preview.data && target ? (
        <ConfirmDialog
          title="Confirmar cambio de habitación"
          busy={apply.isPending}
          busyLabel="Aplicando…"
          confirmLabel="Confirmar cambio"
          body={
            <p>
              <strong>{preview.data.currentRoom.roomLabel}</strong> pasará a <strong>{target.roomLabel}</strong>. La
              disponibilidad de {target.roomLabel} se revalida nuevamente en el momento de confirmar. El Stay conserva su
              ID y el folio con sus cargos; no se crea un segundo folio.
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