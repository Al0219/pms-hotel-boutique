import { StatusBadge, type StatusBadgeVariant } from "@/shared/components";

import type { Room, RoomStatus } from "../model/room";

import styles from "./room-board.module.css";

interface RoomDetailProps {
  room: Room;
}

const STATUS_LABELS: Record<RoomStatus, string> = {
  ACTIVE: "Activa",
  OOO: "Fuera de orden",
  OOS: "Fuera de servicio",
};

const STATUS_VARIANTS: Record<RoomStatus, StatusBadgeVariant> = {
  ACTIVE: "success",
  OOO: "warning",
  OOS: "error",
};

function Reference({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return <div className={styles.reference}><dt>{label}</dt><dd>{value ?? "Sin referencia"}</dd></div>;
}

export function RoomDetail({ room }: Readonly<RoomDetailProps>) {
  return <section className={styles.detail} aria-labelledby="room-detail-title">
    <p className={styles.eyebrow}>Habitación</p>
    <h2 id="room-detail-title">{room.number}</h2>
    <div className={styles.summaryGrid}>
      <Reference label="Habitación" value={room.id} />
      <Reference label="Property ID" value={room.propertyId} />
    </div>
    <div className={styles.detailGrid}>
      <section className={styles.detailCard} aria-labelledby="room-status-title">
        <h3 id="room-status-title">Estado de habitación</h3>
        <StatusBadge variant={STATUS_VARIANTS[room.status]}>{STATUS_LABELS[room.status]}</StatusBadge>
        <p className={styles.note}>
          OOO (Fuera de orden) y OOS (Fuera de servicio) no eliminan la habitación del sistema.
        </p>
      </section>
      <section className={styles.detailCard} aria-labelledby="room-type-title">
        <h3 id="room-type-title">Tipo de habitación</h3>
        <p>{room.roomTypeLabel}</p>
      </section>
    </div>
  </section>;
}
