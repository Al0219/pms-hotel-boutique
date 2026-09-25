import type { GroupLifecycleStatus } from "./group-lifecycle";

export interface Group {
  id: string;
  propertyId: string;
  name: string;
  status: GroupLifecycleStatus;
  /** Commercial block reference; never physical inventory. Null when no block applies. */
  roomBlockReference: string | null;
  /** Append-only audit reference. Null when no audit entry is available yet. */
  auditReference: string | null;
}
