"use client";

import { useMemo, useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";
import { useRooms } from "@/modules/rooms";

import { useDiscrepancyResolutions, useResolveDiscrepancy } from "../hooks/use-cleaning-transition";
import { useRoomCleaning } from "../hooks/use-room-cleaning";
import type { DiscrepancyKind } from "../model/housekeeping-discrepancy";
import { buildDiscrepancies } from "../model/housekeeping-discrepancy";
import { CLEANING_STATUS_LABELS } from "./cleaning-status-labels";

import styles from "./housekeeping-board.module.css";

const KIND_LABELS: Record<DiscrepancyKind, string> = {
  NOT_READY_FOR_SALE: "No lista para venta",
  READY_BUT_BLOCKED: "Lista pero bloqueada",
};

interface HousekeepingDiscrepanciesProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Rooms contract. */
  roomsEndpoint?: string;
  /** Must be supplied only after Backend approves the provisional Housekeeping contract. */
  cleaningEndpoint?: string;
}

export function HousekeepingDiscrepancies({ propertyId, roomsEndpoint, cleaningEndpoint }: Readonly<HousekeepingDiscrepanciesProps>) {
  const roomsQuery = useRooms(propertyId, roomsEndpoint);
  const cleaningQuery = useRoomCleaning(propertyId, cleaningEndpoint);
  const resolutionsQuery = useDiscrepancyResolutions(propertyId, cleaningEndpoint);
  const resolveMutation = useResolveDiscrepancy(propertyId, cleaningEndpoint);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const discrepancies = useMemo(() => {
    if (!roomsQuery.data || !cleaningQuery.data || !resolutionsQuery.data) {
      return null;
    }
    const resolvedIds = new Set(resolutionsQuery.data.map((entry) => entry.roomId));
    return buildDiscrepancies(roomsQuery.data, cleaningQuery.data, resolvedIds);
  }, [roomsQuery.data, cleaningQuery.data, resolutionsQuery.data]);

  if (!propertyId || !roomsEndpoint || !cleaningEndpoint) {
    return null;
  }

  const isLoading = roomsQuery.isLoading || cleaningQuery.isLoading || resolutionsQuery.isLoading;
  if (isLoading) {
    return <section className={styles.listPanel} aria-busy="true" aria-labelledby="discrepancies-title"><h2 id="discrepancies-title" className={styles.sectionTitle}>Discrepancias</h2><p>Cargando discrepancias…</p></section>;
  }

  const error = roomsQuery.error ?? cleaningQuery.error ?? resolutionsQuery.error;
  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudieron comparar Front Office y Housekeeping."
      : "No se pudieron cargar las discrepancias.";
    return (
      <section className={styles.listPanel} role="alert" aria-labelledby="discrepancies-title">
        <h2 id="discrepancies-title" className={styles.sectionTitle}>Discrepancias</h2>
        <p>{message}</p>
        <button
          type="button"
          onClick={() => {
            void roomsQuery.refetch();
            void cleaningQuery.refetch();
            void resolutionsQuery.refetch();
          }}
        >
          Reintentar
        </button>
      </section>
    );
  }

  if (!discrepancies?.length) {
    return (
      <section className={styles.listPanel} aria-labelledby="discrepancies-title">
        <h2 id="discrepancies-title" className={styles.sectionTitle}>Discrepancias</h2>
        <p className={styles.note}>Front Office y Housekeeping coinciden. Sin discrepancias pendientes.</p>
      </section>
    );
  }

  const closeResolve = () => {
    setResolvingId(null);
    setReason("");
  };

  return (
    <section className={styles.listPanel} aria-labelledby="discrepancies-title">
      <div className={styles.panelHeader}>
        <div><p className={styles.eyebrow}>Front Office vs Housekeeping</p><h2 id="discrepancies-title" className={styles.sectionTitle}>Discrepancias</h2></div>
        <span className={styles.count}>{discrepancies.length} pendientes</span>
      </div>
      <ul className={styles.list}>
        {discrepancies.map((entry) => (
          <li key={entry.roomId} className={styles.discrepancyItem}>
            <div>
              <strong>{entry.roomLabel}</strong>
              <p className={styles.note}>{`${KIND_LABELS[entry.kind]} · FO: ${entry.frontOffice} · HK: ${CLEANING_STATUS_LABELS[entry.housekeeping]}`}</p>
            </div>
            {resolvingId === entry.roomId ? (
              <form
                className={styles.resolveForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!reason.trim()) {
                    return;
                  }
                  resolveMutation.mutate(
                    { roomId: entry.roomId, reason: reason.trim() },
                    { onSuccess: closeResolve },
                  );
                }}
              >
                <label className={styles.reasonField}>
                  <span>Motivo de resolución (obligatorio)</span>
                  <input
                    className={styles.reasonInput}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={280}
                    placeholder="Cómo se resolvió la diferencia"
                  />
                </label>
                <div className={styles.actions}>
                  <button type="button" onClick={closeResolve}>Volver</button>
                  <button type="submit" disabled={!reason.trim() || resolveMutation.isPending}>
                    {resolveMutation.isPending ? "Resolviendo…" : "Resolver"}
                  </button>
                </div>
                {resolveMutation.isError ? (
                  <p role="alert">No se pudo registrar la resolución.</p>
                ) : null}
              </form>
            ) : (
              <button type="button" onClick={() => { resolveMutation.reset(); setReason(""); setResolvingId(entry.roomId); }}>
                Resolver
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
