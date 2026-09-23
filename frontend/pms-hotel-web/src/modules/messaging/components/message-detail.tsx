import type { OperationalMessage, OperationalMessageSenderRole, OperationalMessageStatus } from "../model/operational-message";

import styles from "./messaging-center.module.css";

interface MessageDetailProps {
  message: OperationalMessage;
}

const STATUS_LABELS: Record<OperationalMessageStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En curso",
  RESOLVED: "Resuelta",
};

const SENDER_LABELS: Record<OperationalMessageSenderRole, string> = {
  OPERATIONS: "Operaciones",
  RECEPTION: "Recepción",
  CONCIERGE: "Conserjería",
};

function Reference({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return <div className={styles.reference}><dt>{label}</dt><dd>{value ?? "Sin referencia"}</dd></div>;
}

export function MessageDetail({ message }: Readonly<MessageDetailProps>) {
  return <section className={styles.detail} aria-labelledby="messaging-detail-title">
    <p className={styles.eyebrow}>Operational Message</p>
    <h2 id="messaging-detail-title">{message.subject}</h2>
    <div className={styles.summaryGrid}>
      <Reference label="Mensaje" value={message.id} />
      <Reference label="Estado" value={STATUS_LABELS[message.status]} />
      <Reference label="Remitente" value={SENDER_LABELS[message.senderRole]} />
    </div>
    <div className={styles.detailGrid}>
      <section className={styles.detailCard} aria-labelledby="messaging-content-title">
        <h3 id="messaging-content-title">Contenido</h3>
        <p className={styles.bodyText}>{message.body}</p>
        <dl className={styles.references}>
          <Reference label="Fecha de creación" value={message.createdAt.toISOString()} />
          <Reference label="Reservación relacionada" value={message.relatedReservationId} />
        </dl>
        <p className={styles.note}>
          Cola interna: Operaciones no responde directamente al huésped. Solo Recepción gestiona comunicación externa.
        </p>
      </section>
    </div>
  </section>;
}
