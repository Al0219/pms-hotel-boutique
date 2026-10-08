"use client";

import { useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";
import { ConfirmDialog } from "@/shared/components";

import { useAddRoomingEntry, useRemoveRoomingEntry } from "../hooks/use-group-rooming";
import type { Group } from "../model/group";

import styles from "./group-center.module.css";

interface GroupRoomingPanelProps {
  group: Group;
  propertyId: string;
  endpoint: string;
}

export function GroupRoomingPanel({ group, propertyId, endpoint }: Readonly<GroupRoomingPanelProps>) {
  const addMutation = useAddRoomingEntry(propertyId, endpoint);
  const removeMutation = useRemoveRoomingEntry(propertyId, endpoint);
  const [guestName, setGuestName] = useState("");
  const [roomLabel, setRoomLabel] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const formValid = guestName.trim().length > 0 && roomLabel.trim().length > 0;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formValid || addMutation.isPending) {
      return;
    }
    addMutation.mutate(
      { groupId: group.id, guestName: guestName.trim(), roomLabel: roomLabel.trim() },
      {
        onSuccess: () => {
          setGuestName("");
          setRoomLabel("");
        },
      },
    );
  };

  const removingEntry = group.roomingList.find((entry) => entry.id === removingId) ?? null;

  return (
    <section className={styles.detailCard} aria-labelledby="group-rooming-title">
      <h3 id="group-rooming-title">Rooming list</h3>
      {group.roomingList.length === 0 ? (
        <p className={styles.transitionHint}>Sin huéspedes registrados en la rooming list.</p>
      ) : (
        <ul className={styles.roomingList}>
          {group.roomingList.map((entry) => (
            <li key={entry.id} className={styles.roomingItem}>
              <span><strong>{entry.guestName}</strong><small>{entry.roomLabel}</small></span>
              <button
                type="button"
                onClick={() => {
                  removeMutation.reset();
                  setRemovingId(entry.id);
                }}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className={styles.roomingForm} onSubmit={submit}>
        <label>
          <span>Huésped</span>
          <input
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            maxLength={120}
            placeholder="Nombre del huésped"
          />
        </label>
        <label>
          <span>Habitación</span>
          <input
            value={roomLabel}
            onChange={(event) => setRoomLabel(event.target.value)}
            maxLength={20}
            placeholder="201"
          />
        </label>
        <button type="submit" disabled={!formValid || addMutation.isPending}>
          {addMutation.isPending ? "Agregando…" : "Agregar"}
        </button>
      </form>

      {addMutation.isError ? (
        <p role="alert">
          {addMutation.error instanceof HttpNetworkError
            ? "Sin conexión. No se pudo agregar a la rooming list."
            : "No se pudo agregar a la rooming list."}
        </p>
      ) : null}
      {removeMutation.isError && !removingEntry ? (
        <p role="alert">No se pudo quitar de la rooming list.</p>
      ) : null}

      {removingEntry ? (
        <ConfirmDialog
          title="Quitar de la rooming list"
          body={<p>{`${removingEntry.guestName} (${removingEntry.roomLabel}) saldrá de la rooming list de ${group.name}.`}</p>}
          confirmLabel="Quitar"
          busyLabel="Quitando…"
          destructive
          busy={removeMutation.isPending}
          onConfirm={() =>
            removeMutation.mutate(
              { groupId: group.id, entryId: removingEntry.id },
              { onSuccess: () => setRemovingId(null) },
            )
          }
          onCancel={() => setRemovingId(null)}
        />
      ) : null}
    </section>
  );
}
