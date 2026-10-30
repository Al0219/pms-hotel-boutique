import { describe, expect, it } from 'vitest';
import { mapJourneySummary, mapJourneyDocument, mapSimulatedReceipt } from './stay-journey.mapper';
import { context, document, receipt, summary } from '@/test/stay-journey-fixture';
const map = (v: unknown) => mapJourneySummary(v, context.propertyId, context.reservationId, context.stayId);
describe('persisted stay journey mapping', () => {
  it('maps exact money, immutable document and strips extra fields', () => {
    expect(map({ ...summary(), pan: 'forbidden-upstream' })).toEqual(summary());
    expect(mapJourneyDocument(document(), context.propertyId, context.reservationId, context.stayId)).toEqual(document());
    expect(mapSimulatedReceipt(receipt())).toEqual(receipt());
  });
  it('rejects mixed contexts, currencies, malformed money and false payment success', () => {
    for (const v of [{ ...summary(), currency: 'USD' }, { ...summary(), balance: 100 }, { ...summary(), stay: { ...summary().stay, stayId: context.propertyId } }, { ...summary(), verifiable: null }, { ...summary(), disclaimer: 'Factura fiscal' }]) expect(() => map(v)).toThrow();
    expect(() => mapSimulatedReceipt({ ...receipt(), movementId: null })).toThrow();
    expect(() => mapSimulatedReceipt({ ...receipt(), result: 'DECLINED' })).toThrow();
    expect(mapSimulatedReceipt({ ...receipt(), result: 'ERROR', movementId: null }).result).toBe('ERROR');
  });
});
