"use client";

import { useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";
import { ConfirmDialog } from "@/shared/components";

import { useApplyCleaningTransition } from "../hooks/use-cleaning-transition";
import type { RoomCleaning, RoomCleaningStatus } from "../model/room-cleaning";
import {
  allowedCleaningTransitions,
  cleaningTransitionRequiresReason,
} from "../model/room-cleaning-transition";
import { CLEANING_STATUS_LABELS } from "./cleaning-status-labels";

import styles from "./housekeeping-board.module.css";

const TRANSITION_LABELS: Record<RoomCleaningStatus, string> = {
  DIRTY: "Volver a limpieza",
  CLEAN: "Marcar limpia",
  INSPECTED: "Marcar inspeccionada",
};

interface CleaningTransitionPanelProps {
  room: RoomCleaning;
  propertyId: string;
  endpoint: string;
}

export function CleaningTransitionPanel({ room, propertyId, endpoint }: Readonly<CleaningTransitionPanelProps>) {
  const mutation = useApplyCleaningTransition(propertyId, endpoint);
  const [pending, setPending] = useState<RoomCleaningStatus | null>(null);
  const [reason, setReason] = useState("");

  const requiresReason = pending !== null && cleaningTransitionRequiresReason(pending);
  const reasonValid = !requiresReason || reason.trim().length > 0;

  const close = () => {
    setPending(null);
    setReason("");
  };

  const confirm = () => {
    if (!pending || !reasonValid) {
      return;
    }
    mutation.mutate(
      { roomId: room.id, toStatus: pending, reason: requiresReason ? reason.trim() : null },
      { onSuccess: close },
    );
  };

  return (
    <section className={styles.detailCard} aria-labelledby="cleaning-transition-title">
      <h3 id="cleaning-transition-title">Acciones de limpieza</h3>
      <div className={styles.actions}>
        {allowedCleaningTransitions(room.status).map((target) => (
          <button
            key={target}
            className={pending === target && target === "DIRTY" ? styles.dangerButton : styles.actionButton}
            type="button"
            onClick={() => {
              mutation.reset();
              setReason("");
              setPending(target);
            }}
          >
            {room.status === "INSPECTED" && target === "DIRTY" ? "Rechazar inspección" : TRANSITION_LABELS[target]}
          </button>
        ))}
      </div>

      {mutation.isSuccess && mutation.data ? (
        <p className={styles.success} role="status">
          Estado actualizado a {CLEANING_STATUS_LABELS[mutation.data.status]}.
        </p>
      ) : null}

      {mutation.isError ? (
        <div className={styles.errorBlock} role="alert">
          <p>{mutation.error instanceof HttpNetworkError ? "Sin conexión. No se pudo registrar la transición." : "No se pudo registrar la transición."}</p>
          <button className={styles.actionButton} type="button" onClick={() => mutation.reset()}>
            Reintentar
          </button>
        </div>
      ) : null}

      {pending ? (
        <ConfirmDialog
          title={pending === "DIRTY" && room.status === "INSPECTED" ? "Rechazar inspección" : `Confirmar: ${TRANSITION_LABELS[pending].toLowerCase()}`}
          body={
            <>
              <p>
                {room.roomLabel} pasará de {CLEANING_STATUS_LABELS[room.status].toLowerCase()} a {CLEANING_STATUS_LABELS[pending].toLowerCase()}.
              </p>
              {requiresReason ? (
                <label className={styles.reasonField}>
                  <span>Motivo (obligatorio)</span>
                  <textarea
                    className={styles.reasonInput}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={3}
                    maxLength={280}
                    placeholder="Describe el motivo del rechazo"
                  />
                </label>
              ) : null}
            </>
          }
          confirmLabel={pending === "DIRTY" ? "Volver a limpieza" : "Confirmar"}
          busyLabel="Registrando…"
          destructive={pending === "DIRTY"}
          busy={mutation.isPending}
          confirmDisabled={!reasonValid}
          onConfirm={confirm}
          onCancel={close}
        />
      ) : null}
    </section>
  );
}
