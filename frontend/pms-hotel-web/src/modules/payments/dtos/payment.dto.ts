/**
 * PROVISIONAL API CONTRACT - Payments & Guarantees
 * Corresponde a la tarea IMP-WEB-0109 (WEB-4).
 * Regla de seguridad obligatoria: PROHIBIDO almacenar o enviar PAN o CVV.
 */

export type PaymentMethodDto = "CREDIT_CARD" | "DEBIT_CARD" | "PAY_AT_HOTEL";

export type PaymentStatusDto = "AUTHORIZED" | "PENDING_GUARANTEE" | "DECLINED" | "FAILED";

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
