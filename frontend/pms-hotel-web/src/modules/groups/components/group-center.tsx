"use client";

import { useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";

import { useGroups } from "../hooks/use-groups";
import type { GroupLifecycleStatus } from "../model/group-lifecycle";
import { GroupDetail } from "./group-detail";
import styles from "./group-center.module.css";

interface GroupCenterProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Group contract. */
  endpoint?: string;
  /** Supplied by composition once Backend confirms the transition contract. */
  onTransition?: (groupId: string, target: GroupLifecycleStatus) => void;
}

export function GroupCenter({ propertyId, endpoint, onTransition }: Readonly<GroupCenterProps>) {
  const { data: groups, error, isLoading, refetch } = useGroups(propertyId, endpoint);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  if (!propertyId) {
    return <main className={styles.page} role="status"><h1>Grupos</h1><p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar grupos.</p></main>;
  }

  if (!endpoint) {
    return <main className={styles.page} role="status"><h1>Grupos</h1><p>La consulta de grupos estará disponible al confirmar el contrato API con Backend.</p></main>;
  }

  if (isLoading) {
    return <main className={styles.page} aria-busy="true"><p>Cargando grupos…</p></main>;
  }

  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudo consultar los grupos."
      : "No se pudieron cargar los grupos.";

    return <main className={styles.page} role="alert"><p>{message}</p><button type="button" onClick={() => void refetch()}>Reintentar</button></main>;
  }

  if (!groups?.length) {
    return <main className={styles.page}><h1>Grupos</h1><p>No hay grupos para esta propiedad.</p></main>;
  }

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? groups[0];

  return <main className={styles.page}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>B2B</p>
      <h1>Grupos</h1>
      <p>Consulta los grupos de la propiedad {propertyId} y controla su lifecycle sin saltos inválidos.</p>
    </header>
    <div className={styles.content}>
      <section className={styles.listPanel} aria-labelledby="group-list-title">
        <div className={styles.panelHeader}>
          <div><p className={styles.eyebrow}>Grupos</p><h2 id="group-list-title" className={styles.sectionTitle}>Directorio de grupos</h2></div>
          <span className={styles.count}>{groups.length} registrados</span>
        </div>
        <ul className={styles.list}>
          {groups.map((group) => <li key={group.id}>
            <button
              className={styles.groupButton}
              type="button"
              aria-pressed={group.id === selectedGroup.id}
              onClick={() => setSelectedGroupId(group.id)}
            >
              <span><strong>{group.name}</strong><small>{group.id}</small></span>
              <span className={styles.status}>{group.status}</span>
            </button>
          </li>)}
        </ul>
      </section>
      <GroupDetail group={selectedGroup} onTransition={onTransition} propertyId={propertyId} endpoint={endpoint} />
    </div>
  </main>;
}
