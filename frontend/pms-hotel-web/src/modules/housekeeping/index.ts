/**
 * Public API for the housekeeping module.
 * Export only intentionally public Domain Models, hooks and components.
 * Do not expose DTOs, mappers or service internals without an approved reason.
 */

export { HousekeepingBoard } from "./components/housekeeping-board";
export { StaffHousekeepingPage } from './components/staff-housekeeping-page';
export { useStaffHousekeepingRooms } from './hooks/use-staff-housekeeping';
export { mapStaffHousekeepingBoard, mapStaffHousekeepingRoom } from './mappers/staff-housekeeping.mapper';
export type { HousekeepingDiscrepancy, DiscrepancyKind } from "./model/housekeeping-discrepancy";
export type { RoomCleaning, RoomCleaningStatus } from "./model/room-cleaning";
export type { CleaningTransitionResult, DiscrepancyResolution } from "./model/room-cleaning-transition";

export { projectGuestCleaningRequests } from './mappers/guest-cleaning-request.mapper';
