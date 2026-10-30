export interface StaffCancellationFinanceDto {
  folioId: string; currency: string; accommodationMinor: number; paidMinor: number;
  penaltyMinor: number; balanceAfterMinor: number; dueMinor: number; creditMinor: number;
}
export interface StaffCancellationResultDto {
  operationId: string; propertyId: string; reservationId: string; status: 'CANCELLED';
  policyCode: string; completedAt: string; staysCancelled: number;
  financial: StaffCancellationFinanceDto; reason: string;
}
export interface StaffCancellationPreviewDto {
  propertyId: string; reservationId: string; confirmationCode: string; policyCode: string;
  penaltyPercent: number; canCancel: boolean; blockingCode: string | null; fingerprint: string | null;
  stayCount: number; financial: StaffCancellationFinanceDto | null; completed: StaffCancellationResultDto | null;
}
