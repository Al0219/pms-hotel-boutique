import { describe, expect, it } from 'vitest';
import { mapAvailabilityResponseToDomain } from '@/modules/availability';
import { publicCatalogueFixture } from '@/data/mocks/public-catalogue';
import { resolveSelection } from './room-catalogue';
import { selectionPriceSummary } from './selection-price-summary';

const rooms = mapAvailabilityResponseToDomain(publicCatalogueFixture).roomTypes;
describe('Selection quote summary', () => {
  it('multiplies server room and fee estimates by quantity without adding inventory per rate', () => {
    const result = selectionPriceSummary(resolveSelection([{ roomTypeId: rooms[0].roomTypeId, ratePlanId: rooms[0].ratePlans[0].ratePlanId, quantity: 2 }], rooms));
    expect(result).toEqual({ allValid: true, completeEstimate: true, rooms: [{ currency: 'USD', amount: 870 }], service: [{ currency: 'USD', amount: 44 }], taxes: [{ currency: 'USD', amount: 96 }], estimated: [{ currency: 'USD', amount: 1010 }] });
  });
  it('does not treat absent tax metadata as zero or include an unavailable selection', () => {
    const selection = [{ roomTypeId: rooms[0].roomTypeId, ratePlanId: rooms[0].ratePlans[0].ratePlanId, quantity: 1 }];
    const missing = rooms.map(room => ({ ...room, ratePlans: room.ratePlans.map(rate => ({ ...rate, priceBreakdown: undefined })) }));
    expect(selectionPriceSummary(resolveSelection(selection, missing))).toMatchObject({ allValid: true, completeEstimate: false, taxes: [], estimated: [] });
    expect(selectionPriceSummary(resolveSelection([{ ...selection[0], quantity: 3 }], rooms))).toMatchObject({ allValid: false, completeEstimate: false, rooms: [], estimated: [] });
  });
  it('keeps different currencies separate and uses server quotes rather than nightly multiplication', () => {
    const mixed = [rooms[0], { ...rooms[1], ratePlans: rooms[1].ratePlans.map(rate => ({ ...rate, currency: 'EUR', totalAmount: 500, priceBreakdown: { serviceCharge: 20, estimatedTaxes: 30, estimatedTotal: 550 } })) }];
    const selection = mixed.map(room => ({ roomTypeId: room.roomTypeId, ratePlanId: room.ratePlans[0].ratePlanId, quantity: 1 }));
    expect(selectionPriceSummary(resolveSelection(selection, mixed)).estimated).toEqual([{ currency: 'USD', amount: 505 }, { currency: 'EUR', amount: 550 }]);
  });
});
