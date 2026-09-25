/**
 * Public API for the integrations module.
 * Export only intentionally public Domain Models, hooks and components.
 * Do not expose DTOs, mappers or service internals without an approved reason.
 */

export { IntegrationCenter } from "./components/integration-center";
export { ErrorQueue } from "./components/error-queue";
export type { Integration } from "./model/integration";
export type { IntegrationCategory, IntegrationHealth } from "./model/integration-taxonomy";
export type { IntegrationError, IntegrationErrorStatus } from "./model/integration-error";
