/**
 * Public API for the stays module.
 * Export only intentionally public Domain Models, hooks and components.
 * Do not expose DTOs, mappers or service internals without an approved reason.
 */

export { RoomMove } from "./components/room-move";
export type {
  RoomMoveCandidate,
  RoomMovePreview,
  RoomMoveResult,
} from "./model/room-move";