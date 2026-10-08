"use client";

import { useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";
import { ConfirmDialog } from "@/shared/components";

import { useChangeRoomStatus } from "../hooks/use-room-status-change";
import type { Room, RoomStatus } from "../model/room";
import {
  allowedRoomStatusChanges,
  isValidBlockPeriod,
  roomStatusChangeRequiresPeriod,
} from "../model/room-status-change";
import { ROOM_STATUS_LABELS } from "./room-status-labels";

import styles from "./room-board.module.css";

const STATUS_ACTION_LABELS: Record<RoomStatus, string> = {
  ACTIVE: "Liberar a activa",
  OOO: "Poner fuera de orden",
  OOS: "Poner fuera de servicio",
};

function todayKey(): string {
  const today = new Date();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function defaultEndKey(): string {
  const end = new Date();
  end.setDate(end.getDate() + 7);
  const month = `${end.getMonth() + 1}`.padStart(2, "0");
  const day = `${end.getDate()}`.padStart(2, "0");
  return `${end.getFullYear()}-${month}-${day}`;
}

interface RoomStatusPanelProps {
  room: Room;
  propertyId: string;
  endpoint: string;
}

export function RoomStatusPanel({ room, propertyId, endpoint }: Readonly<RoomStatusPanelProps>) {
  const mutation = useChangeRoomStatus(propertyId, endpoint);
  const [pending, setPending] = useState<RoomStatus | null>(null);
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState(todayKey());
  const [endDate, setEndDate] = useState(defaultEndKey());

  const requiresPeriod = pending !== null && roomStatusChangeRequiresPeriod(pending);
  const reasonValid = reason.trim().length > 0;
  const periodValid = !requiresPeriod || isValidBlockPeriod(startDate, endDate);
  const formValid = reasonValid && periodValid;

  const close = () => {
    setPending(null);
    setReason("");
  };

  const confirm = () => {
    if (!pending || !formValid) {
      return;
    }
    mutation.mutate(
      {
        roomId: room.id,
        toStatus: pending,
        reason: reason.trim(),
        startDate: requiresPeriod ? startDate : null,
        endDate: requiresPeriod ? endDate : null,
      },
      { onSuccess: close },
    );
  };

  return (
    <section className={styles.detailCard} aria-labelledby="room-status-change-title">
      <h3 id="room-status-change-title">Bloqueo OOO / OOS</h3>
      <div className={styles.actions}>
        {allowedRoomStatusChanges(room.status).map((target) => (
          <button
            key={target}
            className={target === "ACTIVE" ? styles.actionButton : styles.dangerButton}
            type="button"
            onClick={() => {
              mutation.reset();
              setReason("");
              setStartDate(todayKey());
              setEndDate(defaultEndKey());
              setPending(target);
            }}
          >
            {STATUS_ACTION_LABELS[target]}
          </button>
        ))}
      </div>
      <p className={styles.note}>
        OOO y OOS no eliminan la habitación. El recálculo de disponibilidad (ATS) lo refleja el módulo Inventory.
      </p>

      {mutation.isSuccess && mutation.data ? (
        <p className={styles.success} role="status">
          Habitación {ROOM_STATUS_LABELS[mutation.data.status].toLowerCase()}.
        </p>
      ) : null}

      {mutation.isError ? (
        <div className={styles.errorBlock} role="alert">
          <p>{mutation.error instanceof HttpNetworkError ? "Sin conexión. No se pudo registrar el cambio." : "No se pudo registrar el cambio de estado."}</p>
          <button className={styles.actionButton} type="button" onClick={() => mutation.reset()}>
            Reintentar
          </button>
        </div>
      ) : null}

      {pending ? (
        <ConfirmDialog
          title={STATUS_ACTION_LABELS[pending]}
          body={
            <>
              <p>
                {`Habitación ${room.number} pasará de ${ROOM_STATUS_LABELS[room.status].toLowerCase()} a ${ROOM_STATUS_LABELS[pending].toLowerCase()}.`}
              </p>
              <label className={styles.reasonField}>
                <span>Motivo (obligatorio)</span>
                <textarea
                  className={styles.reasonInput}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  maxLength={280}
                  placeholder="Describe el motivo del bloqueo o liberación"
                />
              </label>
              {requiresPeriod ? (
                <div className={styles.periodGrid}>
                  <label className={styles.reasonField}>
                    <span>Desde</span>
                    <input
                      className={styles.reasonInput}
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                    />
                  </label>
                  <label className={styles.reasonField}>
                    <span>Hasta</span>
                    <input
                      className={styles.reasonInput}
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                    />
                  </label>
                  {!periodValid ? <p role="alert">El fin debe ser posterior al inicio.</p> : null}
                </div>
              ) : null}
            </>
          }
          confirmLabel="Confirmar"
          busyLabel="Registrando…"
          destructive={pending !== "ACTIVE"}
          busy={mutation.isPending}
          confirmDisabled={!formValid}
          onConfirm={confirm}
          onCancel={close}
        />
      ) : null}
    </section>
  );
}
