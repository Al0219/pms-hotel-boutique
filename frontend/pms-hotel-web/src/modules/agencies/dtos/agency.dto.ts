/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface AgencyDto {
  agency_id: string;
  property_id: string;
  legal_name: string;
  status_code: string;
  /** Null when the Agency has no contract reference available. */
  contract_reference: string | null;
  /** Null when no commission reference is available. This is not a commission amount. */
  commission_reference: string | null;
  /** Null when no voucher reference applies. */
  voucher_reference: string | null;
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface AgencyListDto {
  agencies: AgencyDto[];
}
