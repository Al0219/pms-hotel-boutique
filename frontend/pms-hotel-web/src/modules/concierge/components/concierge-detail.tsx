import type { ConciergeTask, ConciergeTaskStatus } from "../model/concierge-task";

import styles from "./concierge-center.module.css";

interface ConciergeDetailProps {
  task: ConciergeTask;
}

const STATUS_LABELS: Record<ConciergeTaskStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completada",
};

function Reference({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return <div className={styles.reference}><dt>{label}</dt><dd>{value ?? "Sin referencia"}</dd></div>;
}

export function ConciergeDetail({ task }: Readonly<ConciergeDetailProps>) {
  return <section className={styles.detail} aria-labelledby="concierge-detail-title">
    <p className={styles.eyebrow}>Concierge Task</p>
    <h2 id="concierge-detail-title">{task.title}</h2>
    <div className={styles.summaryGrid}>
      <Reference label="Tarea" value={task.id} />
      <Reference label="Estado" value={STATUS_LABELS[task.status]} />
      <Reference label="Property ID" value={task.propertyId} />
    </div>
    <div className={styles.detailGrid}>
      <section className={styles.detailCard} aria-labelledby="concierge-coordination-title">
        <h3 id="concierge-coordination-title">Coordinación interna</h3>
        <dl className={styles.references}>
          <Reference label="Referencia de recepción" value={task.receptionReference} />
        </dl>
        <p className={styles.note}>
          Cola interna: Conserjería trabaja la tarea y coordina con Recepción. No envía mensajes directos al huésped.
        </p>
      </section>
    </div>
  </section>;
}
