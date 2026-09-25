/**
 * Public API for the housekeeping module.
 * Export only intentionally public Domain Models, hooks and components.
 * Do not expose DTOs, mappers or service internals without an approved reason.
 */

export { HousekeepingBoard } from "./components/housekeeping-board";
export type { HousekeepingDiscrepancy, DiscrepancyKind } from "./model/housekeeping-discrepancy";
export type { RoomCleaning, RoomCleaningStatus } from "./model/room-cleaning";
export type { CleaningTransitionResult, DiscrepancyResolution } from "./model/room-cleaning-transition";
