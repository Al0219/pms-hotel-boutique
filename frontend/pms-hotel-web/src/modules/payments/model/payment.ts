/**
 * Domain Models for Payments & Guarantees Lifecycle
 * Reglas de dominio:
 * - Separación de amount (number) y currency (string).
 * - Fechas como instancias de Date.
 * - Sin exposición de PAN ni CVV.
 * - Registro append-only en el audit trail financiero.
 */

export type PaymentMethod = "CREDIT_CARD" | "DEBIT_CARD" | "PAY_AT_HOTEL" | "CASH" | "BANK_TRANSFER";

export type PaymentStatus =
  | "PENDING_GUARANTEE"
  | "AUTHORIZED"
  | "CAPTURED"
  | "PARTIALLY_CAPTURED"
  | "VOIDED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "DECLINED"
  | "FAILED";

export interface PaymentAuditEntry {
  auditId: string;
  action: "AUTHORIZE" | "CAPTURE" | "VOID" | "REFUND" | "FAIL";
  amount: number;
  currency: string;
  performedBy: string;
  performedAt: Date;
  reason?: string | null;
  providerReference?: string | null;
}

export interface Payment {
  paymentId: string;
  folioId: string;
  reservationId?: string | null;
  stayId?: string | null;
  method: PaymentMethod;
  status: PaymentStatus;
  currency: string;
  authorizedAmount: number;
  capturedAmount: number;
  refundedAmount: number;
  remainingCapturableAmount: number;
  remainingRefundableAmount: number;
  providerReference: string | null;
  last4: string | null;
  cardBrand: string | null;
  createdAt: Date;
  updatedAt: Date;
  failureReason: string | null;
  auditTrail: PaymentAuditEntry[];
}

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

export interface PaymentListFilters {
  folioId?: string;
  reservationId?: string;
  status?: PaymentStatus;
  fromDate?: string;
  toDate?: string;
}

export interface PaymentListResult {
  payments: Payment[];
  totalCount: number;
}
