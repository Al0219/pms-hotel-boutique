import { StatusBadge } from "@/shared/components";

import type { Room } from "../model/room";
import { ROOM_STATUS_LABELS, ROOM_STATUS_VARIANTS } from "./room-status-labels";
import { RoomStatusPanel } from "./room-status-panel";

import styles from "./room-board.module.css";

interface RoomDetailProps {
  room: Room;
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Rooms contract. */
  endpoint?: string;
}

function Reference({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return <div className={styles.reference}><dt>{label}</dt><dd>{value ?? "Sin referencia"}</dd></div>;
}

export function RoomDetail({ room, propertyId, endpoint }: Readonly<RoomDetailProps>) {
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
        <StatusBadge variant={ROOM_STATUS_VARIANTS[room.status]}>{ROOM_STATUS_LABELS[room.status]}</StatusBadge>
        <p className={styles.note}>
          OOO (Fuera de orden) y OOS (Fuera de servicio) no eliminan la habitación del sistema.
        </p>
      </section>
      <section className={styles.detailCard} aria-labelledby="room-type-title">
        <h3 id="room-type-title">Tipo de habitación</h3>
        <p>{room.roomTypeLabel}</p>
      </section>
      {propertyId && endpoint ? (
        <RoomStatusPanel room={room} propertyId={propertyId} endpoint={endpoint} />
      ) : null}
    </div>
  </section>;
}
