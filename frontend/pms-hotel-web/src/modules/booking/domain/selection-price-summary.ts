import { selectionTotals, type resolveSelection } from './room-catalogue';

/** Sum only validated server quotes. Optional fees are never assumed to be zero. */
export function selectionPriceSummary(items: ReturnType<typeof resolveSelection>) {
  const allValid = items.length > 0 && items.every(item => item.valid);
  const completeEstimate = allValid && items.every(item => item.rate?.priceBreakdown);
  const sumField = (field: 'serviceCharge' | 'estimatedTaxes' | 'estimatedTotal') => selectionTotals(items.map(item =>
    item.rate ? { ...item, rate: { ...item.rate, totalMinor: undefined, totalAmount: item.rate.priceBreakdown?.[field] ?? 0 } } : item));
  return {
    allValid, completeEstimate,
    rooms: selectionTotals(items),
    service: completeEstimate ? sumField('serviceCharge') : [],
    taxes: completeEstimate ? sumField('estimatedTaxes') : [],
    estimated: completeEstimate ? sumField('estimatedTotal') : [],
  };
}
