/**
 * Public API for the integrations module.
 * Export only intentionally public Domain Models, hooks and components.
 * Do not expose DTOs, mappers or service internals without an approved reason.
 */

export { IntegrationCenter } from "./components/integration-center";
export type { Integration } from "./model/integration";
export type { IntegrationCategory, IntegrationHealth } from "./model/integration-taxonomy";
