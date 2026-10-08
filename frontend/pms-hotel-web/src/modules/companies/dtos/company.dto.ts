/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface CompanyDto {
  company_id: string;
  property_id: string;
  legal_name: string;
  status_code: string;
  /** Null when the Company has no property-scoped agreement reference. */
  agreement_reference: string | null;
  /** Null when no credit line applies. This is a reference, never a balance. */
  credit_reference: string | null;
  /** Direct bill is a request only; this module never treats it as auto-approved. */
  direct_bill_requested: boolean;
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface CompanyListDto {
  companies: CompanyDto[];
}
