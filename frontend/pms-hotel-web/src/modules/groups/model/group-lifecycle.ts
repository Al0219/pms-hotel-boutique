/**
 * Group lifecycle is strictly sequential:
 * INQUIRY -> TENTATIVE -> DEFINITE -> IN_HOUSE -> CLOSED
 * Invalid jumps are never offered nor applied.
 */
export const GROUP_LIFECYCLE = ["INQUIRY", "TENTATIVE", "DEFINITE", "IN_HOUSE", "CLOSED"] as const;

export type GroupLifecycleStatus = (typeof GROUP_LIFECYCLE)[number];

const NEXT_STATUS: Record<GroupLifecycleStatus, GroupLifecycleStatus | null> = {
  INQUIRY: "TENTATIVE",
  TENTATIVE: "DEFINITE",
  DEFINITE: "IN_HOUSE",
  IN_HOUSE: "CLOSED",
  CLOSED: null,
};

export function isGroupLifecycleStatus(value: string): value is GroupLifecycleStatus {
  return (GROUP_LIFECYCLE as readonly string[]).includes(value);
}

/** Only the immediately following status is reachable; CLOSED has no successor. */
export function nextGroupStatus(status: GroupLifecycleStatus): GroupLifecycleStatus | null {
  return NEXT_STATUS[status];
}

export function canTransitionGroup(from: GroupLifecycleStatus, to: GroupLifecycleStatus): boolean {
  return NEXT_STATUS[from] === to;
}
