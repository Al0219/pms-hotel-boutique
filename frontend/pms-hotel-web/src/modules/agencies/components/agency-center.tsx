"use client";

import { useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";

import { useAgencies } from "../hooks/use-agencies";
import { AgencyDetail } from "./agency-detail";
import styles from "./agency-center.module.css";

interface AgencyCenterProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Agency contract. */
  endpoint?: string;
}

export function AgencyCenter({ propertyId, endpoint }: Readonly<AgencyCenterProps>) {
  const { data: agencies, error, isLoading, refetch } = useAgencies(propertyId, endpoint);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);

  if (!propertyId) {
    return <main className={styles.page} role="status"><h1>Agencias</h1><p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar agencias.</p></main>;
  }

  if (!endpoint) {
    return <main className={styles.page} role="status"><h1>Agencias</h1><p>La consulta de agencias estará disponible al confirmar el contrato API con Backend.</p></main>;
  }

  if (isLoading) {
    return <main className={styles.page} aria-busy="true"><p>Cargando agencias…</p></main>;
  }

  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudo consultar las agencias."
      : "No se pudieron cargar las agencias.";

    return <main className={styles.page} role="alert"><p>{message}</p><button type="button" onClick={() => void refetch()}>Reintentar</button></main>;
  }

  if (!agencies?.length) {
    return <main className={styles.page}><h1>Agencias</h1><p>No hay agencias para esta propiedad.</p></main>;
  }

  const selectedAgency = agencies.find((agency) => agency.id === selectedAgencyId) ?? agencies[0];

  return <main className={styles.page}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>B2B</p>
      <h1>Empresas y Agencias</h1>
      <p>Consulta las agencias de la propiedad {propertyId}, sus contratos y referencias comerciales.</p>
    </header>
    <div className={styles.content}>
      <section className={styles.listPanel} aria-labelledby="agency-list-title">
        <div className={styles.panelHeader}>
          <div><p className={styles.eyebrow}>Agencias</p><h2 id="agency-list-title" className={styles.sectionTitle}>Directorio comercial</h2></div>
          <span className={styles.count}>{agencies.length} registradas</span>
        </div>
        <ul className={styles.list}>
          {agencies.map((agency) => <li key={agency.id}>
            <button
              className={styles.agencyButton}
              type="button"
              aria-pressed={agency.id === selectedAgency.id}
              onClick={() => setSelectedAgencyId(agency.id)}
            >
              <span><strong>{agency.legalName}</strong><small>{agency.id}</small></span>
              <span className={styles.status}>{agency.statusCode}</span>
            </button>
          </li>)}
        </ul>
      </section>
      <AgencyDetail agency={selectedAgency} />
    </div>
  </main>;
}
