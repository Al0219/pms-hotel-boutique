/**
 * Domain Models for Payments & Guarantees
 * Reglas de dominio:
 * - Separación de amount (number) y currency (string).
 * - Fechas como instancias de Date.
 * - Sin exposición de PAN ni CVV.
 */

export type PaymentMethod = "CREDIT_CARD" | "DEBIT_CARD" | "PAY_AT_HOTEL";

export type PaymentStatus = "AUTHORIZED" | "PENDING_GUARANTEE" | "DECLINED" | "FAILED";

export interface PaymentGuaranteeRequest {
  paymentMethod: PaymentMethod;
  cardHolderName?: string;
  cardToken?: string;
  last4?: string;
  cardBrand?: string;
  expirationMonth?: number;
  expirationYear?: number;
  amount: number;
  currency: string;
  reservationReference?: string;
}

export interface PaymentGuaranteeResult {
  paymentId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  providerReference: string | null;
  last4: string | null;
  cardBrand: string | null;
  createdAt: Date;
  failureReason: string | null;
}
