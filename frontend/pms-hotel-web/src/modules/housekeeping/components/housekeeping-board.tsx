"use client";

import { useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";
import { StatusBadge } from "@/shared/components";

import { useRoomCleaning } from "../hooks/use-room-cleaning";
import type { RoomCleaningStatus } from "../model/room-cleaning";
import { RoomCleaningDetail } from "./room-cleaning-detail";
import styles from "./housekeeping-board.module.css";

interface HousekeepingBoardProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Housekeeping contract. */
  endpoint?: string;
}

const STATUS_LABELS: Record<RoomCleaningStatus, string> = {
  DIRTY: "Sucia",
  CLEAN: "Limpia",
  INSPECTED: "Inspeccionada",
};

export function HousekeepingBoard({ propertyId, endpoint }: Readonly<HousekeepingBoardProps>) {
  const { data: rooms, error, isLoading, refetch } = useRoomCleaning(propertyId, endpoint);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  if (!propertyId) {
    return <main className={styles.page} role="status"><h1>Housekeeping</h1><p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar housekeeping.</p></main>;
  }

  if (!endpoint) {
    return <main className={styles.page} role="status"><h1>Housekeeping</h1><p>El tablero de housekeeping estará disponible al confirmar el contrato API con Backend.</p></main>;
  }

  if (isLoading) {
    return <main className={styles.page} aria-busy="true"><p>Cargando tablero de housekeeping…</p></main>;
  }

  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudo consultar housekeeping."
      : "No se pudo cargar el tablero de housekeeping.";

    return <main className={styles.page} role="alert"><p>{message}</p><button type="button" onClick={() => void refetch()}>Reintentar</button></main>;
  }

  if (!rooms?.length) {
    return <main className={styles.page}><h1>Housekeeping</h1><p>No hay habitaciones para esta propiedad.</p></main>;
  }

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? rooms[0];

  return <main className={styles.page}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>Operations</p>
      <h1>Housekeeping</h1>
      <p>Tablero base de limpieza de la propiedad {propertyId}: habitaciones con IDs coherentes y sin fetch directo en la UI.</p>
    </header>
    <div className={styles.content}>
      <section className={styles.listPanel} aria-labelledby="housekeeping-list-title">
        <div className={styles.panelHeader}>
          <div><p className={styles.eyebrow}>Habitaciones</p><h2 id="housekeeping-list-title" className={styles.sectionTitle}>Estado de limpieza</h2></div>
          <span className={styles.count}>{rooms.length} registradas</span>
        </div>
        <ul className={styles.list}>
          {rooms.map((room) => <li key={room.id}>
            <button
              className={styles.roomButton}
              type="button"
              aria-pressed={room.id === selectedRoom.id}
              onClick={() => setSelectedRoomId(room.id)}
            >
              <span><strong>{room.roomLabel}</strong><small>{room.id}</small></span>
              <StatusBadge variant={room.status === "INSPECTED" ? "success" : room.status === "CLEAN" ? "info" : "warning"} size="sm">
                {STATUS_LABELS[room.status]}
              </StatusBadge>
            </button>
          </li>)}
        </ul>
      </section>
      <RoomCleaningDetail room={selectedRoom} />
    </div>
  </main>;
}
