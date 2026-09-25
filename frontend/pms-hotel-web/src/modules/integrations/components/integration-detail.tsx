import Link from "next/link";

import type { Integration } from "../model/integration";
import type { IntegrationHealth } from "../model/integration-taxonomy";
import { INTEGRATION_HEALTH_LABELS } from "./integration-health-labels";

import styles from "./integration-center.module.css";

const HEALTH_BADGE: Record<IntegrationHealth, string> = {
  HEALTHY: styles.healthHealthy,
  ATTENTION: styles.healthAttention,
  DEGRADED: styles.healthDegraded,
  CONFIGURED: styles.healthConfigured,
};

interface IntegrationDetailProps {
  integration: Integration;
  onClose: () => void;
}

export function IntegrationDetail({ integration, onClose }: Readonly<IntegrationDetailProps>) {
  return (
    <section className={styles.detailCard} aria-labelledby="integration-detail-title">
      <div className={styles.detailHeader}>
        <div>
          <p className={styles.eyebrow}>Detalle de integración</p>
          <h2 id="integration-detail-title">{integration.provider}</h2>
        </div>
        <button type="button" onClick={onClose}>
          Volver
        </button>
      </div>
      <dl className={styles.detailGrid}>
        <div><dt>Categoría</dt><dd>{integration.category}</dd></div>
        <div><dt>Adaptador</dt><dd>{integration.adapter ?? "Sin adaptador"}</dd></div>
        <div>
          <dt>Estado</dt>
          <dd>
            <span className={`${styles.badge} ${HEALTH_BADGE[integration.health]}`}>
              {INTEGRATION_HEALTH_LABELS[integration.health]}
            </span>
          </dd>
        </div>
        <div><dt>Última sincronización</dt><dd>{integration.lastSync ?? "Sin sincronización"}</dd></div>
      </dl>
      <h3 className={styles.capabilitiesTitle}>Capacidades</h3>
      {integration.capabilities.length > 0 ? (
        <ul className={styles.capabilitiesList}>
          {integration.capabilities.map((capability) => (
            <li key={capability}>{capability}</li>
          ))}
        </ul>
      ) : (
        <p className={styles.muted}>Sin capacidades registradas.</p>
      )}
      <Link
        className={styles.errorsLink}
        href={`/integraciones/errores?integrationId=${encodeURIComponent(integration.id)}`}
      >
        Ver errores de {integration.provider}
      </Link>
    </section>
  );
}
