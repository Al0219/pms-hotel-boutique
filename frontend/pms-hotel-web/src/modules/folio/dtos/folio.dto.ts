/**
 * PROVISIONAL API CONTRACT - Folio & Charges
 * Corresponde a la tarea IMP-WEB-0401 (WEB-4).
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
  created_at: string;
}
