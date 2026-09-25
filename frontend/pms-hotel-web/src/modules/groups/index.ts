/**
 * Public API for the groups module.
 * Export only intentionally public Domain Models, hooks and components.
 * Do not expose DTOs, mappers or service internals without an approved reason.
 */

export { GroupCenter } from "./components/group-center";
export type { Group } from "./model/group";
export type { GroupLifecycleStatus } from "./model/group-lifecycle";
