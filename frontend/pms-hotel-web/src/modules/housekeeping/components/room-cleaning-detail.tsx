import { StatusBadge, type StatusBadgeVariant } from "@/shared/components";

import type { RoomCleaning, RoomCleaningStatus } from "../model/room-cleaning";

import styles from "./housekeeping-board.module.css";

interface RoomCleaningDetailProps {
  room: RoomCleaning;
}

const STATUS_LABELS: Record<RoomCleaningStatus, string> = {
  DIRTY: "Sucia",
  CLEAN: "Limpia",
  INSPECTED: "Inspeccionada",
};

const STATUS_VARIANTS: Record<RoomCleaningStatus, StatusBadgeVariant> = {
  DIRTY: "warning",
  CLEAN: "info",
  INSPECTED: "success",
};

function Reference({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return <div className={styles.reference}><dt>{label}</dt><dd>{value ?? "Sin referencia"}</dd></div>;
}

export function RoomCleaningDetail({ room }: Readonly<RoomCleaningDetailProps>) {
  return <section className={styles.detail} aria-labelledby="room-cleaning-detail-title">
    <p className={styles.eyebrow}>Housekeeping</p>
    <h2 id="room-cleaning-detail-title">{room.roomLabel}</h2>
    <div className={styles.summaryGrid}>
      <Reference label="Habitación" value={room.id} />
      <Reference label="Property ID" value={room.propertyId} />
    </div>
    <div className={styles.detailGrid}>
      <section className={styles.detailCard} aria-labelledby="room-cleaning-status-title">
        <h3 id="room-cleaning-status-title">Estado de limpieza</h3>
        <StatusBadge variant={STATUS_VARIANTS[room.status]}>{STATUS_LABELS[room.status]}</StatusBadge>
        <p className={styles.note}>
          Estado base de limpieza. Los overlays (DND/Turndown/Pickup) viajan por separado y no sustituyen este estado.
        </p>
      </section>
    </div>
  </section>;
}
