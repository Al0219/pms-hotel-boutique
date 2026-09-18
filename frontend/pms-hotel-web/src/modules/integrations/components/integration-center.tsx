"use client";

import { useMemo } from "react";

import { HttpNetworkError } from "@/lib/http/errors";
import { DataTable } from "@/shared/components";

import { useIntegrations } from "../hooks/use-integrations";
import { summarizeIntegrations } from "../model/integration";
import type { IntegrationHealth } from "../model/integration-taxonomy";
import styles from "./integration-center.module.css";

interface IntegrationCenterProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Integration contract. */
  endpoint?: string;
}

const HEALTH_LABELS: Record<IntegrationHealth, string> = {
  HEALTHY: "HEALTHY",
  ATTENTION: "ATTENTION",
  DEGRADED: "DEGRADED",
  CONFIGURED: "CONFIGURED",
};

const HEALTH_BADGE: Record<IntegrationHealth, string> = {
  HEALTHY: styles.healthHealthy,
  ATTENTION: styles.healthAttention,
  DEGRADED: styles.healthDegraded,
  CONFIGURED: styles.healthConfigured,
};

export function IntegrationCenter({ propertyId, endpoint }: Readonly<IntegrationCenterProps>) {
  const { data: integrations, error, isLoading, refetch } = useIntegrations(propertyId, endpoint);
  const summary = useMemo(() => summarizeIntegrations(integrations ?? []), [integrations]);

  if (!propertyId) {
    return <main className={styles.page} role="status"><h1>Integration Center</h1><p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar integraciones.</p></main>;
  }

  if (!endpoint) {
    return <main className={styles.page} role="status"><h1>Integration Center</h1><p>La consulta de integraciones estará disponible al confirmar el contrato API con Backend.</p></main>;
  }

  if (isLoading) {
    return <main className={styles.page} aria-busy="true"><p>Cargando integraciones…</p></main>;
  }

  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudieron consultar las integraciones."
      : "No se pudieron cargar las integraciones.";

    return <main className={styles.page} role="alert"><p>{message}</p><button type="button" onClick={() => void refetch()}>Reintentar</button></main>;
  }

  if (!integrations?.length) {
    return <main className={styles.page}><h1>Integration Center</h1><p>No hay integraciones para esta propiedad.</p></main>;
  }

  return <main className={styles.page}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>Integraciones</p>
      <h1>Integration Center</h1>
      <p>Conectores por categoría, salud, última sincronización y capacidades · property scope {propertyId}.</p>
    </header>
    <section className={styles.kpiGrid} aria-label="Resumen de integraciones">
      <div className={styles.kpiCard}>
        <p className={styles.kpiLabel}>Categorías</p>
        <p className={styles.kpiValue}>{summary.categories}</p>
        <p className={styles.kpiHint}>core</p>
      </div>
      <div className={styles.kpiCard}>
        <p className={styles.kpiLabel}>HEALTHY</p>
        <p className={styles.kpiValue}>{summary.healthy}</p>
        <p className={styles.kpiHint}>categorías</p>
      </div>
      <div className={styles.kpiCard}>
        <p className={styles.kpiLabel}>Requieren revisión</p>
        <p className={styles.kpiValue}>{summary.needsReview}</p>
        <p className={styles.kpiHint}>ATTN + DEGRADED</p>
      </div>
      <div className={styles.kpiCard}>
        <p className={styles.kpiLabel}>CONFIGURED</p>
        <p className={styles.kpiValue}>{summary.configured}</p>
        <p className={styles.kpiHint}>sin error</p>
      </div>
    </section>
    <DataTable
      label="Conectores de integración de la propiedad"
      minWidth={960}
      rows={integrations}
      getRowKey={(integration) => integration.id}
      columns={[
        {
          key: "category",
          header: "Categoría",
          render: (integration) => <strong className={styles.category}>{integration.category}</strong>,
        },
        {
          key: "provider",
          header: "Proveedor / Conectores",
          render: (integration) => (
            <>
              <span className={styles.provider}>{integration.provider}</span>
              {integration.adapter ? <span className={styles.adapter}>{integration.adapter}</span> : null}
            </>
          ),
        },
        {
          key: "capabilities",
          header: "Capacidades / Modelo",
          render: (integration) => (
            <span className={styles.capabilities}>
              {integration.capabilities.length > 0 ? integration.capabilities.join(" · ") : "Sin capacidades"}
            </span>
          ),
        },
        {
          key: "state",
          header: "Estado / Última sync",
          render: (integration) => (
            <>
              <span className={`${styles.badge} ${HEALTH_BADGE[integration.health]}`}>{HEALTH_LABELS[integration.health]}</span>
              <span className={styles.lastSync}>{integration.lastSync ?? "Sin sincronización"}</span>
            </>
          ),
        },
      ]}
    />
  </main>;
}
