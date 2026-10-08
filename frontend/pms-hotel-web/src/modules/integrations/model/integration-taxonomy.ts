export const INTEGRATION_CATEGORIES = [
  "Channels",
  "Payments",
  "POS",
  "Fiscal",
  "Locks",
  "Messaging",
  "Accounting",
] as const;

export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

export const INTEGRATION_HEALTH = ["HEALTHY", "ATTENTION", "DEGRADED", "CONFIGURED"] as const;

export type IntegrationHealth = (typeof INTEGRATION_HEALTH)[number];

export function isIntegrationCategory(value: string): value is IntegrationCategory {
  return (INTEGRATION_CATEGORIES as readonly string[]).includes(value);
}

export function isIntegrationHealth(value: string): value is IntegrationHealth {
  return (INTEGRATION_HEALTH as readonly string[]).includes(value);
}
