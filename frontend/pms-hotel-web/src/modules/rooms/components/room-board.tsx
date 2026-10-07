"use client";

import { useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";
import { StatusBadge } from "@/shared/components";

import { useRooms } from "../hooks/use-rooms";
import { ROOM_STATUS_LABELS, ROOM_STATUS_VARIANTS } from "./room-status-labels";
import { RoomDetail } from "./room-detail";
import styles from "./room-board.module.css";

interface RoomBoardProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Rooms contract. */
  endpoint?: string;
}

export function RoomBoard({ propertyId, endpoint }: Readonly<RoomBoardProps>) {
  const { data: rooms, error, isLoading, refetch } = useRooms(propertyId, endpoint);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');

  if (!propertyId) {
    return <main className={styles.page} role="status"><h1>Habitaciones</h1><p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar habitaciones.</p></main>;
  }

  if (!endpoint) {
    return <main className={styles.page} role="status"><h1>Habitaciones</h1><p>El tablero de habitaciones estará disponible al confirmar el contrato API con Backend.</p></main>;
  }

  if (isLoading) {
    return <main className={styles.page} aria-busy="true"><p>Cargando tablero de habitaciones…</p></main>;
  }

  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudo consultar habitaciones."
      : "No se pudo cargar el tablero de habitaciones.";

    return <main className={styles.page} role="alert"><p>{message}</p><button type="button" onClick={() => void refetch()}>Reintentar</button></main>;
  }

  if (!rooms?.length) {
    return <main className={styles.page}><h1>Habitaciones</h1><p>No hay habitaciones para esta propiedad.</p></main>;
  }

  const visible = rooms.filter(room => (status === 'ALL' || room.status === status)
    && `${room.number} ${room.roomTypeLabel}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')));
  const selectedRoom = visible.find(room => room.id === selectedRoomId) ?? visible[0];

  return <main className={styles.page}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>Operaciones</p>
      <h1>Habitaciones</h1>
      <p>Tablero de habitaciones de la propiedad {propertyId}: unidades físicas con estado y tipo.</p>
      <p className={styles.note}>El estado operativo indica si la habitación está operativa, fuera de orden o fuera de servicio. No indica si está ocupada.</p>
    </header>
    <div className={styles.content}>
      <section className={styles.listPanel} aria-labelledby="room-list-title">
        <div className={styles.panelHeader}>
          <div><p className={styles.eyebrow}>Habitaciones</p><h2 id="room-list-title" className={styles.sectionTitle}>Estado de habitación</h2></div>
          <span className={styles.count}>{rooms.length} registradas · {visible.length} visibles</span>
        </div>
        <div className={styles.filters}><label>Buscar habitación<input type="search" value={search} placeholder="Número o tipo" onChange={event => setSearch(event.target.value)} /></label>
          <label>Estado operativo<select value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">Todos</option><option value="ACTIVE">Operativa</option><option value="OOO">OOO · Fuera de orden</option><option value="OOS">OOS · Fuera de servicio</option></select></label>
          <button type="button" onClick={() => { setSearch(''); setStatus('ALL'); }}>Limpiar filtros</button></div>
        {!visible.length && <p role="status">No hay habitaciones con estos filtros.</p>}
        <ul className={styles.list}>
          {visible.map((room) => <li key={room.id}>
            <button
              className={styles.roomButton}
              type="button"
              aria-pressed={room.id === selectedRoom?.id}
              onClick={() => setSelectedRoomId(room.id)}
            >
              <span><strong>{room.number}</strong><small>{room.roomTypeLabel}</small></span>
              <StatusBadge variant={ROOM_STATUS_VARIANTS[room.status]} size="sm">
                {ROOM_STATUS_LABELS[room.status]}
              </StatusBadge>
            </button>
          </li>)}
        </ul>
      </section>
      {selectedRoom && <RoomDetail room={selectedRoom} propertyId={propertyId} endpoint={endpoint} />}
    </div>
  </main>;
}
