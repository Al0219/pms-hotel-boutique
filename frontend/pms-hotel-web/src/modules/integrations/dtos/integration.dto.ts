/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 * This contract intentionally carries no credentials or secrets.
 */
export interface IntegrationDto {
  integration_id: string;
  property_id: string;
  /** One of Channels | Payments | POS | Fiscal | Locks | Messaging | Accounting. */
  category: string;
  provider: string;
  /** Null when the connector has no adapter reference. This is not a credential. */
  adapter: string | null;
  /** One of HEALTHY | ATTENTION | DEGRADED | CONFIGURED. */
  health: string;
  /** Display value only. Null when no synchronization has been reported yet. */
  last_sync: string | null;
  capabilities: string[];
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface IntegrationListDto {
  integrations: IntegrationDto[];
}
