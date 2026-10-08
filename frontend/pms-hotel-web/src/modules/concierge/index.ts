/**
 * Public API for the concierge module.
 * Export only intentionally public Domain Models, hooks and components.
 * Do not expose DTOs, mappers or service internals without an approved reason.
 */

export { ConciergeCenter } from "./components/concierge-center";
export type { ConciergeTask, ConciergeTaskStatus } from "./model/concierge-task";
