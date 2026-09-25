/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 * This queue is internal: it carries no guest contact channel and no direct guest message.
 */
export interface ConciergeTaskDto {
  task_id: string;
  property_id: string;
  title: string;
  /** One of PENDING | IN_PROGRESS | COMPLETED. */
  status: string;
  /** Internal reception coordination reference. Null when not assigned yet. */
  reception_reference: string | null;
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface ConciergeTaskListDto {
  tasks: ConciergeTaskDto[];
}
