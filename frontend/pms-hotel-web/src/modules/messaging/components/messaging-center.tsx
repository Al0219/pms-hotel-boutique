"use client";

import { useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";

import { useOperationalMessages } from "../hooks/use-operational-messages";
import { MessageDetail } from "./message-detail";
import styles from "./messaging-center.module.css";

interface MessagingCenterProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Messaging contract. */
  endpoint?: string;
}

export function MessagingCenter({ propertyId, endpoint }: Readonly<MessagingCenterProps>) {
  const { data: messages, error, isLoading, refetch } = useOperationalMessages(propertyId, endpoint);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  if (!propertyId) {
    return <main className={styles.page} role="status"><h1>Mensajería operativa</h1><p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar la cola de mensajería.</p></main>;
  }

  if (!endpoint) {
    return <main className={styles.page} role="status"><h1>Mensajería operativa</h1><p>La cola de mensajería estará disponible al confirmar el contrato API con Backend.</p></main>;
  }

  if (isLoading) {
    return <main className={styles.page} aria-busy="true"><p>Cargando cola de mensajería…</p></main>;
  }

  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudo consultar la cola de mensajería."
      : "No se pudo cargar la cola de mensajería.";

    return <main className={styles.page} role="alert"><p>{message}</p><button type="button" onClick={() => void refetch()}>Reintentar</button></main>;
  }

  if (!messages?.length) {
    return <main className={styles.page}><h1>Mensajería operativa</h1><p>No hay mensajes internos para esta propiedad.</p></main>;
  }

  const selectedMessage = messages.find((msg) => msg.id === selectedMessageId) ?? messages[0];

  return <main className={styles.page}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>Operations</p>
      <h1>Mensajería operativa</h1>
      <p className={styles.internalNote}>Cola interna: Operaciones no responde directamente al huésped. Solo Recepción gestiona comunicación externa.</p>
    </header>
    <div className={styles.content}>
      <section className={styles.listPanel} aria-labelledby="messaging-list-title">
        <div className={styles.panelHeader}>
          <div><p className={styles.eyebrow}>Mensajes</p><h2 id="messaging-list-title" className={styles.sectionTitle}>Cola interna</h2></div>
          <span className={styles.count}>{messages.length} registrados</span>
        </div>
        <ul className={styles.list}>
          {messages.map((msg) => <li key={msg.id}>
            <button
              className={styles.messageButton}
              type="button"
              aria-pressed={msg.id === selectedMessage.id}
              onClick={() => setSelectedMessageId(msg.id)}
            >
              <span><strong>{msg.subject}</strong><small>{msg.senderRole}</small></span>
              <span className={styles.status}>{msg.status}</span>
            </button>
          </li>)}
        </ul>
      </section>
      <MessageDetail message={selectedMessage} />
    </div>
  </main>;
}
