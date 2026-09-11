/**
 * PROVISIONAL API CONTRACT - Payments & Guarantees Lifecycle
 * Corresponde a las tareas IMP-WEB-0109, IMP-WEB-0404, 0405, 0406, 0407, 0408 (WEB-4).
 * Regla de seguridad global obligatoria: PROHIBIDO almacenar o enviar PAN o CVV.
 */

export type PaymentMethodDto = "CREDIT_CARD" | "DEBIT_CARD" | "PAY_AT_HOTEL" | "CASH" | "BANK_TRANSFER";

export type PaymentStatusDto =
  | "PENDING_GUARANTEE"
  | "AUTHORIZED"
  | "CAPTURED"
  | "PARTIALLY_CAPTURED"
  | "VOIDED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "DECLINED"
  | "FAILED";

export interface PaymentAuditEntryDto {
  audit_id: string;
  action: "AUTHORIZE" | "CAPTURE" | "VOID" | "REFUND" | "FAIL";
  amount: string;
  currency: string;
  performed_by: string;
  performed_at: string;
  reason?: string | null;
  provider_reference?: string | null;
}

export interface PaymentDto {
  payment_id: string;
  folio_id: string;
  reservation_id?: string | null;
  stay_id?: string | null;
  method: PaymentMethodDto;
  status: PaymentStatusDto;
  currency: string;
  authorized_amount: string;
  captured_amount: string;
  refunded_amount: string;
  provider_reference: string | null;
  last4: string | null;
  card_brand: string | null;
  created_at: string;
  updated_at: string;
  failure_reason: string | null;
  audit_trail?: PaymentAuditEntryDto[];
}

export interface PaymentGuaranteeRequestDto {
  payment_method: PaymentMethodDto;
  card_holder_name?: string;
  card_token?: string;
  last4?: string;
  card_brand?: string;
  expiration_month?: number;
  expiration_year?: number;
  amount: string;
  currency: string;
  reservation_reference?: string;
}

export interface PaymentGuaranteeResponseDto {
  payment_id: string;
  status: PaymentStatusDto;
  amount: string;
  currency: string;
  provider_reference: string | null;
  last4: string | null;
  card_brand: string | null;
  created_at: string;
  failure_reason: string | null;
}

export interface PaymentListFiltersDto {
  folio_id?: string;
  reservation_id?: string;
  status?: PaymentStatusDto;
  from_date?: string;
  to_date?: string;
}

export interface PaymentListResponseDto {
  payments: PaymentDto[];
  total_count: number;
}

export interface AuthorizePaymentRequestDto {
  folio_id: string;
  reservation_id?: string | null;
  stay_id?: string | null;
  method: PaymentMethodDto;
  amount: string;
  currency: string;
  card_token?: string;
  card_holder_name?: string;
  last4?: string;
  card_brand?: string;
}

