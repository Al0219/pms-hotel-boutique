import type { Group } from "../model/group";
import { GROUP_LIFECYCLE, nextGroupStatus, type GroupLifecycleStatus } from "../model/group-lifecycle";

import styles from "./group-center.module.css";

interface GroupDetailProps {
  group: Group;
  /** Supplied by composition once Backend confirms the transition contract. */
  onTransition?: (groupId: string, target: GroupLifecycleStatus) => void;
}

const STATUS_LABELS: Record<GroupLifecycleStatus, string> = {
  INQUIRY: "Consulta",
  TENTATIVE: "Tentativo",
  DEFINITE: "Confirmado",
  IN_HOUSE: "En casa",
  CLOSED: "Cerrado",
};

function Reference({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return <div className={styles.reference}><dt>{label}</dt><dd>{value ?? "Sin referencia"}</dd></div>;
}

export function GroupDetail({ group, onTransition }: Readonly<GroupDetailProps>) {
  const nextStatus = nextGroupStatus(group.status);
  const currentIndex = GROUP_LIFECYCLE.indexOf(group.status);

  return <section className={styles.detail} aria-labelledby="group-detail-title">
    <p className={styles.eyebrow}>Group Profile</p>
    <h2 id="group-detail-title">{group.name}</h2>
    <div className={styles.summaryGrid}>
      <Reference label="Grupo" value={group.id} />
      <Reference label="Property ID" value={group.propertyId} />
      <Reference label="Estado" value={STATUS_LABELS[group.status]} />
    </div>
    <section className={styles.detailCard} aria-labelledby="group-lifecycle-title">
      <h3 id="group-lifecycle-title">Lifecycle</h3>
      <ol className={styles.lifecycle}>
        {GROUP_LIFECYCLE.map((status, index) => (
          <li
            key={status}
            className={`${styles.lifecycleStep} ${index === currentIndex ? styles.lifecycleStepCurrent : ""} ${index < currentIndex ? styles.lifecycleStepDone : ""}`}
            aria-current={index === currentIndex ? "step" : undefined}
          >
            <span>{STATUS_LABELS[status]}</span>
          </li>
        ))}
      </ol>
      {nextStatus ? (
        <div className={styles.transition}>
          <p className={styles.transitionHint}>Única transición disponible: {STATUS_LABELS[nextStatus]}.</p>
          {onTransition ? (
            <button className={styles.transitionButton} type="button" onClick={() => onTransition(group.id, nextStatus)}>
              Avanzar a {STATUS_LABELS[nextStatus]}
            </button>
          ) : null}
        </div>
      ) : (
        <p className={styles.transitionHint}>El grupo está cerrado; no hay transiciones disponibles.</p>
      )}
    </section>
    <div className={styles.detailGrid}>
      <section className={styles.detailCard} aria-labelledby="group-block-title">
        <h3 id="group-block-title">Room block</h3>
        <dl className={styles.references}><Reference label="Referencia de block" value={group.roomBlockReference} /></dl>
      </section>
      <section className={styles.detailCard} aria-labelledby="group-audit-title">
        <h3 id="group-audit-title">Auditoría</h3>
        <dl className={styles.references}><Reference label="Referencia de auditoría" value={group.auditReference} /></dl>
      </section>
    </div>
  </section>;
}
