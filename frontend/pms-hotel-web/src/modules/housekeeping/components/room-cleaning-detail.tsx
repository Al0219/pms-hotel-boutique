import { StatusBadge } from "@/shared/components";

import type { RoomCleaning } from "../model/room-cleaning";
import { CleaningTransitionPanel } from "./cleaning-transition-panel";
import { CLEANING_STATUS_LABELS, CLEANING_STATUS_VARIANTS } from "./cleaning-status-labels";

import styles from "./housekeeping-board.module.css";

interface RoomCleaningDetailProps {
  room: RoomCleaning;
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Housekeeping contract. */
  endpoint?: string;
}

function Reference({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return <div className={styles.reference}><dt>{label}</dt><dd>{value ?? "Sin referencia"}</dd></div>;
}

export function RoomCleaningDetail({ room, propertyId, endpoint }: Readonly<RoomCleaningDetailProps>) {
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
        <StatusBadge variant={CLEANING_STATUS_VARIANTS[room.status]}>{CLEANING_STATUS_LABELS[room.status]}</StatusBadge>
        <p className={styles.note}>
          Estado base de limpieza. Los overlays (DND/Turndown/Pickup) viajan por separado y no sustituyen este estado.
        </p>
      </section>
      {propertyId && endpoint ? (
        <CleaningTransitionPanel room={room} propertyId={propertyId} endpoint={endpoint} />
      ) : null}
    </div>
  </section>;
}
