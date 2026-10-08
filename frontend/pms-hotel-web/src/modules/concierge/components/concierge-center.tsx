"use client";

import { useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";

import { useConciergeTasks } from "../hooks/use-concierge-tasks";
import { ConciergeDetail } from "./concierge-detail";
import styles from "./concierge-center.module.css";

interface ConciergeCenterProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Concierge contract. */
  endpoint?: string;
}

export function ConciergeCenter({ propertyId, endpoint }: Readonly<ConciergeCenterProps>) {
  const { data: tasks, error, isLoading, refetch } = useConciergeTasks(propertyId, endpoint);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  if (!propertyId) {
    return <main className={styles.page} role="status"><h1>Conserjería</h1><p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar la cola de conserjería.</p></main>;
  }

  if (!endpoint) {
    return <main className={styles.page} role="status"><h1>Conserjería</h1><p>La cola de conserjería estará disponible al confirmar el contrato API con Backend.</p></main>;
  }

  if (isLoading) {
    return <main className={styles.page} aria-busy="true"><p>Cargando cola de conserjería…</p></main>;
  }

  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudo consultar la cola de conserjería."
      : "No se pudo cargar la cola de conserjería.";

    return <main className={styles.page} role="alert"><p>{message}</p><button type="button" onClick={() => void refetch()}>Reintentar</button></main>;
  }

  if (!tasks?.length) {
    return <main className={styles.page}><h1>Conserjería</h1><p>No hay tareas de conserjería para esta propiedad.</p></main>;
  }

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0];

  return <main className={styles.page}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>Operations</p>
      <h1>Conserjería</h1>
      <p>Cola interna de la propiedad {propertyId}: Conserjería trabaja cada tarea y coordina con Recepción.</p>
    </header>
    <div className={styles.content}>
      <section className={styles.listPanel} aria-labelledby="concierge-list-title">
        <div className={styles.panelHeader}>
          <div><p className={styles.eyebrow}>Tareas</p><h2 id="concierge-list-title" className={styles.sectionTitle}>Cola interna</h2></div>
          <span className={styles.count}>{tasks.length} registradas</span>
        </div>
        <ul className={styles.list}>
          {tasks.map((task) => <li key={task.id}>
            <button
              className={styles.taskButton}
              type="button"
              aria-pressed={task.id === selectedTask.id}
              onClick={() => setSelectedTaskId(task.id)}
            >
              <span><strong>{task.title}</strong><small>{task.id}</small></span>
              <span className={styles.status}>{task.status}</span>
            </button>
          </li>)}
        </ul>
      </section>
      <ConciergeDetail task={selectedTask} />
    </div>
  </main>;
}
