import { describe, expect, it } from 'vitest';
import { DomainMappingError } from '@/lib/errors';
import { mapCancellationPreview, mapCancellationReceipt } from './staff-cancellation.mapper';
import { cancellationPreviewFixture as preview, cancellationReceiptFixture as receipt, cancellationScope as scope } from '@/test/staff-cancellation-fixture';

describe('confirmed cancellation contract', () => {
  it.each([0, 5000, 10000, 40000, 100000])('maps exact backend figures with %i paid without repricing', paid => {
    const result = mapCancellationPreview(preview(paid), scope);
    expect(result.financial?.balanceAfterMinor).toBe(10000 - paid);
    expect(mapCancellationReceipt(receipt(paid), scope).financial).toEqual(result.financial);
  });
  it('maps a blocked legacy reservation and immutable completed receipt', () => {
    expect(mapCancellationPreview({ ...preview(), canCancel: false, blockingCode: 'FINANCIAL_REVIEW_REQUIRED', fingerprint: null, financial: null }, scope).canCancel).toBe(false);
    const completed = mapCancellationPreview({ ...preview(), canCancel: false, blockingCode: 'ALREADY_CANCELLED', fingerprint: null, financial: null, completed: receipt() }, scope);
    expect(completed.completed?.reason).toBe('Solicitud del huésped');
  });
  it('fails closed on foreign scope, missing previews, unsafe amounts and invented policy', () => {
    for (const value of [{ ...preview(), propertyId: scope.reservationId }, { ...preview(), financial: null },
      { ...preview(), fingerprint: '' }, { ...preview(), policyCode: 'invented' }, { ...preview(), penaltyPercent: 20 },
      { ...preview(), completed: receipt() }, { ...preview(), financial: { ...preview().financial!, creditMinor: 123 } },
      { ...preview(), financial: { ...preview().financial!, paidMinor: Number.MAX_SAFE_INTEGER + 1 } }])
      expect(() => mapCancellationPreview(value, scope)).toThrow(DomainMappingError);
    for (const value of [{ ...receipt(), operationId: 'bad' }, { ...receipt(), completedAt: 'yesterday' }, { ...receipt(), reason: '' }])
      expect(() => mapCancellationReceipt(value, scope)).toThrow(DomainMappingError);
  });
});
