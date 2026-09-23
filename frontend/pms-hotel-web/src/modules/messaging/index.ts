/**
 * Public API for the messaging module.
 * Export only intentionally public Domain Models, hooks and components.
 * Do not expose DTOs, mappers or service internals without an approved reason.
 */

export { MessagingCenter } from "./components/messaging-center";
export type { OperationalMessage, OperationalMessageStatus, OperationalMessageSenderRole } from "./model/operational-message";
