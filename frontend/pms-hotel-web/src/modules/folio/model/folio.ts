/**
 * Domain Models for Folio, Transactions, Routing, Split & Transfer
 * Reglas de dominio:
 * - Separación de amount (number) y currency (string).
 * - Fechas como Date.
 * - Balance calculado (charges activos - payments).
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
  originalSplitChargeId?: string | null;
  isTransferred?: boolean;
  transferredToFolioId?: string | null;
  transferredFromFolioId?: string | null;
  transferReason?: string | null;
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

export interface ChargeRoutingRule {
  ruleId: string;
  sourceFolioId: string;
  targetFolioId: string;
  category: FolioChargeCategory;
  percentage: number;
  createdAt: Date;
}

export interface SplitChargePortion {
  targetFolioId: string;
  amount: number;
  description?: string;
}

export interface SplitChargeRequest {
  chargeId: string;
  portions: SplitChargePortion[];
}

export interface SplitChargeResult {
  originalChargeId: string;
  sourceFolioId: string;
  createdCharges: FolioCharge[];
  updatedSourceFolio: Folio;
}

export interface TransferChargeRequest {
  chargeId: string;
  targetFolioId: string;
  reason: string;
}

export interface TransferChargeResult {
  transferredChargeId: string;
  sourceFolioId: string;
  targetFolioId: string;
  reason: string;
  transferredAt: Date;
  updatedSourceFolio: Folio;
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
  routingRules?: ChargeRoutingRule[];
  createdAt: Date;
}
