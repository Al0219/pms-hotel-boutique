export const INTEGRATION_ERROR_STATUSES = ["PENDING", "RETRYING", "RESOLVED", "FAILED"] as const;

export type IntegrationErrorStatus = (typeof INTEGRATION_ERROR_STATUSES)[number];

export function isIntegrationErrorStatus(value: string): value is IntegrationErrorStatus {
  return (INTEGRATION_ERROR_STATUSES as readonly string[]).includes(value);
}

export interface IntegrationErrorEvent {
  status: IntegrationErrorStatus;
  at: Date;
  note: string | null;
}

export interface IntegrationError {
  id: string;
  propertyId: string;
  integrationId: string;
  integrationProvider: string;
  kind: string;
  message: string;
  status: IntegrationErrorStatus;
  attempts: number;
  maxAttempts: number;
  retryable: boolean;
  lastAttemptAt: Date | null;
  history: IntegrationErrorEvent[];
}

/** Solo PENDING o FAILED retryable admiten reintento manual. */
export function canRetryError(error: IntegrationError): boolean {
  return error.retryable && (error.status === "PENDING" || error.status === "FAILED");
}
