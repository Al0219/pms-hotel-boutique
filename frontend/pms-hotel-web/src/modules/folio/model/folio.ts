/**
 * Domain Models for Folio & Transactions
 * Reglas de dominio:
 * - Separación de amount (number) y currency (string).
 * - Fechas como Date.
 * - Balance calculado (charges - payments).
 */

export type FolioType = "GUEST" | "COMPANY" | "MASTER";

export type FolioStatus = "OPEN" | "SETTLED" | "CLOSED";

export type FolioChargeCategory =
  | "ROOM_NIGHT"
  | "RESTAURANT"
  | "SPA"
  | "MINIBAR"
  | "TAX"
  | "SERVICE_FEE"
  | "PARKING"
  | "MISCELLANEOUS";

export interface FolioCharge {
  chargeId: string;
  category: FolioChargeCategory;
  description: string;
  amount: number;
  currency: string;
  postedAt: Date;
  postedBy: string;
  isVoided: boolean;
}

export interface FolioPaymentEntry {
  paymentEntryId: string;
  paymentId: string;
  amount: number;
  currency: string;
  method: string;
  paidAt: Date;
  reference: string | null;
}

export interface Folio {
  folioId: string;
  folioNumber: string;
  reservationId: string;
  stayId: string;
  type: FolioType;
  status: FolioStatus;
  holderName: string;
  roomNumber: string;
  currency: string;
  totalCharges: number;
  totalPayments: number;
  balance: number;
  charges: FolioCharge[];
  payments: FolioPaymentEntry[];
  createdAt: Date;
}
