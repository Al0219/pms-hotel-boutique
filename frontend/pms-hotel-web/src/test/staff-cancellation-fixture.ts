import type { StaffCancellationPreviewDto, StaffCancellationResultDto } from '../modules/reservations/dtos/staff-cancellation.dto';
export const cancellationScope = { propertyId: '11111111-1111-1111-1111-111111111111', reservationId: '22222222-2222-2222-2222-222222222222' };
export function cancellationPreviewFixture(paid = 100000): StaffCancellationPreviewDto {
  const balance = 10000 - paid;
  return { ...cancellationScope, confirmationCode: 'HB-CANCEL-001', policyCode: 'STAFF_PRE_ARRIVAL_TEN_PERCENT_V1',
    penaltyPercent: 10, canCancel: true, blockingCode: null, fingerprint: 'a'.repeat(64), stayCount: 2, completed: null,
    financial: { folioId: '33333333-3333-3333-3333-333333333333', currency: 'GTQ', accommodationMinor: 100000,
      paidMinor: paid, penaltyMinor: 10000, balanceAfterMinor: balance, dueMinor: Math.max(0, balance), creditMinor: Math.max(0, -balance) } };
}
export function cancellationReceiptFixture(paid = 100000): StaffCancellationResultDto {
  return { ...cancellationScope, operationId: '44444444-4444-4444-4444-444444444444', status: 'CANCELLED',
    policyCode: 'STAFF_PRE_ARRIVAL_TEN_PERCENT_V1', completedAt: '2026-10-29T18:30:00.123456Z', staysCancelled: 2,
    financial: cancellationPreviewFixture(paid).financial!, reason: 'Solicitud del huésped' };
}
