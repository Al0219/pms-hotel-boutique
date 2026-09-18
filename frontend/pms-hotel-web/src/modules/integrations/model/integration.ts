import type { IntegrationCategory, IntegrationHealth } from "./integration-taxonomy";

export interface Integration {
  id: string;
  propertyId: string;
  category: IntegrationCategory;
  provider: string;
  /** Adapter reference only. Never a credential or secret. */
  adapter: string | null;
  health: IntegrationHealth;
  /** Display value only. Null when no synchronization has been reported yet. */
  lastSync: string | null;
  capabilities: ReadonlyArray<string>;
}

export interface IntegrationSummary {
  categories: number;
  healthy: number;
  needsReview: number;
  configured: number;
}

/** Counts stay coherent with the listed connectors: review means ATTENTION or DEGRADED. */
export function summarizeIntegrations(integrations: ReadonlyArray<Integration>): IntegrationSummary {
  const categories = new Set(integrations.map((integration) => integration.category));
  let healthy = 0;
  let needsReview = 0;
  let configured = 0;

  for (const integration of integrations) {
    if (integration.health === "HEALTHY") {
      healthy += 1;
    } else if (integration.health === "ATTENTION" || integration.health === "DEGRADED") {
      needsReview += 1;
    } else {
      configured += 1;
    }
  }

  return { categories: categories.size, healthy, needsReview, configured };
}
