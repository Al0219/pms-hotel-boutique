import type { IntegrationHealth } from "../model/integration-taxonomy";

/** Etiquetas en español del estado de salud de una integración. */
export const INTEGRATION_HEALTH_LABELS: Record<IntegrationHealth, string> = {
  HEALTHY: "Saludable",
  ATTENTION: "Requiere atención",
  DEGRADED: "Degradado",
  CONFIGURED: "Configurado",
};
