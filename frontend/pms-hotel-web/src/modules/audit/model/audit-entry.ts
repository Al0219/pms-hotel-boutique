/** Presentation model only; not a confirmed backend contract. */
export interface AuditEntry {
  id: string;
  date: string;
  actor: string;
  role: string;
  module: string;
  action: string;
  property: string;
  status: "SUCCESS" | "WARNING" | "CRITICAL" | "INFO";
  detail: string;
}
