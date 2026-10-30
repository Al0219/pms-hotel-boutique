export interface CancellationScope { propertyId: string; reservationId: string }
export interface CancellationFinance {
  folioId: string; currency: string; accommodationMinor: number; paidMinor: number;
  penaltyMinor: number; balanceAfterMinor: number; dueMinor: number; creditMinor: number;
}
export interface CancellationReceipt extends CancellationScope {
  operationId: string; completedAt: string; staysCancelled: number; reason: string;
  financial: CancellationFinance;
}
export interface CancellationPreview extends CancellationScope {
  confirmationCode: string; penaltyPercent: number; canCancel: boolean; blockingCode: string | null;
  fingerprint: string | null; stayCount: number; financial: CancellationFinance | null;
  completed: CancellationReceipt | null;
}
export interface CancellationRequest { expectedFingerprint: string; reason: string }
