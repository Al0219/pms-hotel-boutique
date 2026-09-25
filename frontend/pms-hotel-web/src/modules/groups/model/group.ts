import type { GroupLifecycleStatus } from "./group-lifecycle";

export interface GroupRoomBlock {
  reference: string;
  startDate: Date;
  endDate: Date;
  roomsBlocked: number;
  roomsPickedUp: number;
}

export interface RoomingEntry {
  id: string;
  guestName: string;
  roomLabel: string;
}

export interface Group {
  id: string;
  propertyId: string;
  name: string;
  status: GroupLifecycleStatus;
  /** Commercial block reference; never physical inventory. Null when no block applies. */
  roomBlockReference: string | null;
  /** Dated, quantified block. Null when the group has no dated block yet. */
  block: GroupRoomBlock | null;
  /** Rooming list of the group. Empty when no entries exist yet. */
  roomingList: RoomingEntry[];
  /** Append-only audit reference. Null when no audit entry is available yet. */
  auditReference: string | null;
}

/** Pickup como fracción 0..1. Sin habitaciones bloqueadas el pickup es 0. */
export function pickupRate(block: GroupRoomBlock): number {
  if (block.roomsBlocked === 0) {
    return 0;
  }
  return Math.min(block.roomsPickedUp / block.roomsBlocked, 1);
}

/** Habitaciones del block aún no recogidas. Nunca negativo. */
export function remainingBlockRooms(block: GroupRoomBlock): number {
  return Math.max(block.roomsBlocked - block.roomsPickedUp, 0);
}
