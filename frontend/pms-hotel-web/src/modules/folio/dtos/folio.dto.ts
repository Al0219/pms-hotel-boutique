/**
 * PROVISIONAL API CONTRACT - Folio, Charges, Routing & Split
 * Corresponde a las tareas IMP-WEB-0401 e IMP-WEB-0402 (WEB-4).
 * Debe validarse contra Backend antes de marcar CONFIRMED.
 */

export type FolioTypeDto = "GUEST" | "COMPANY" | "MASTER";

export type FolioStatusDto = "OPEN" | "SETTLED" | "CLOSED";

export type FolioChargeCategoryDto =
  | "ROOM_NIGHT"
  | "RESTAURANT"
  | "SPA"
  | "MINIBAR"
  | "TAX"
  | "SERVICE_FEE"
  | "PARKING"
  | "MISCELLANEOUS";

export interface FolioChargeDto {
  charge_id: string;
  category: FolioChargeCategoryDto;
  description: string;
  amount: string;
  currency: string;
  posted_at: string;
  posted_by: string;
  is_voided?: boolean;
  original_split_charge_id?: string | null;
}

export interface FolioPaymentEntryDto {
  payment_entry_id: string;
  payment_id: string;
  amount: string;
  currency: string;
  method: string;
  paid_at: string;
  reference: string | null;
}

export interface ChargeRoutingRuleDto {
  rule_id: string;
  source_folio_id: string;
  target_folio_id: string;
  category: FolioChargeCategoryDto;
  percentage: number;
  created_at: string;
}

export interface CreateRoutingRuleRequestDto {
  target_folio_id: string;
  category: FolioChargeCategoryDto;
  percentage?: number;
}

export interface SplitChargePortionDto {
  target_folio_id: string;
  amount: string;
  description?: string;
}

export interface SplitChargeRequestDto {
  charge_id: string;
  portions: SplitChargePortionDto[];
}

export interface SplitChargeResultDto {
  original_charge_id: string;
  source_folio_id: string;
  created_charges: FolioChargeDto[];
  updated_source_folio: FolioDto;
}

export interface FolioDto {
  folio_id: string;
  folio_number: string;
  reservation_id: string;
  stay_id: string;
  type: FolioTypeDto;
  status: FolioStatusDto;
  holder_name: string;
  room_number: string;
  currency: string;
  total_charges: string;
  total_payments: string;
  balance: string;
  charges: FolioChargeDto[];
  payments: FolioPaymentEntryDto[];
  routing_rules?: ChargeRoutingRuleDto[];
  created_at: string;
}
