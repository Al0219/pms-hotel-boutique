export const CONCIERGE_TASK_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;

export type ConciergeTaskStatus = (typeof CONCIERGE_TASK_STATUSES)[number];

export interface ConciergeTask {
  id: string;
  propertyId: string;
  title: string;
  status: ConciergeTaskStatus;
  /** Internal reception coordination reference. Null when not assigned yet. */
  receptionReference: string | null;
}

export function isConciergeTaskStatus(value: string): value is ConciergeTaskStatus {
  return (CONCIERGE_TASK_STATUSES as readonly string[]).includes(value);
}
