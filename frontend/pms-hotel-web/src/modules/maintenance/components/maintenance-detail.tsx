import type { MaintenanceOrder, MaintenanceOrderStatus, MaintenanceRoomImpact } from "../model/maintenance-order";

import styles from "./maintenance-center.module.css";

interface MaintenanceDetailProps {
  order: MaintenanceOrder;
  /** Supplied by composition once Backend confirms the resolution contract. */
  onResolve?: (orderId: string) => void;
}

const STATUS_LABELS: Record<MaintenanceOrderStatus, string> = {
  OPEN: "Abierta",
  IN_PROGRESS: "En progreso",
  RESOLVED: "Resuelta",
};

const IMPACT_LABELS: Record<MaintenanceRoomImpact, string> = {
  NONE: "Sin impacto",
  OOO: "Out of Order",
  OOS: "Out of Service",
};

function Reference({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return <div className={styles.reference}><dt>{label}</dt><dd>{value ?? "Sin referencia"}</dd></div>;
}

export function MaintenanceDetail({ order, onResolve }: Readonly<MaintenanceDetailProps>) {
  const canResolve = order.status !== "RESOLVED";

  return <section className={styles.detail} aria-labelledby="maintenance-detail-title">
    <p className={styles.eyebrow}>Maintenance Order</p>
    <h2 id="maintenance-detail-title">{order.title}</h2>
    <div className={styles.summaryGrid}>
      <Reference label="OT" value={order.id} />
      <Reference label="Habitación" value={order.roomId} />
      <Reference label="Estado" value={STATUS_LABELS[order.status]} />
    </div>
    <div className={styles.detailGrid}>
      <section className={styles.detailCard} aria-labelledby="maintenance-impact-title">
        <h3 id="maintenance-impact-title">Impacto en la habitación</h3>
        <dl className={styles.references}>
          <Reference label="Impacto declarado" value={IMPACT_LABELS[order.roomImpact]} />
          <Reference label="Property ID" value={order.propertyId} />
        </dl>
        <p className={styles.note}>
          Resolver la OT no vuelve vendible la habitación por sí sola: liberar OOO/OOS, la readiness de HK y el recálculo de ATS ocurren fuera de este módulo.
        </p>
        {canResolve && onResolve ? (
          <button className={styles.resolveButton} type="button" onClick={() => onResolve(order.id)}>
            Marcar como resuelta
          </button>
        ) : null}
      </section>
      <section className={styles.detailCard} aria-labelledby="maintenance-history-title">
        <h3 id="maintenance-history-title">Historial</h3>
        <ol className={styles.history}>
          {order.history.map((event, index) => (
            <li key={`${event.status}-${index}`} className={styles.historyItem}>
              <strong>{STATUS_LABELS[event.status]}</strong>
              <span className={styles.historyNote}>{event.note ?? "Sin nota"}</span>
              <span className={styles.historyActor}>{event.actorReference ?? "Sin actor"}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  </section>;
}
