import { describe, expect, it } from 'vitest';
import { DomainMappingError } from '@/lib/errors';
import { formatLedgerMoney, ledgerMinor, paymentMoney } from '../model/staff-folio';
import { folioId, folioProperty, folioReservation, movementId, paymentReceiptFixture, staffFolioFixture } from '../staff-folio.fixture';
import { mapLedgerMoney, mapStaffFolioDetail, mapStaffFolioPage, mapStaffMovementPage, mapStaffPaymentReceipt } from './staff-folio.mapper';

describe('exact Staff ledger boundary', () => {
  it('retains minor units beyond JS safe integers without rounding', () => {
    const money = mapLedgerMoney({ amount: '92233720368547758.07', currency: 'GTQ' });
    expect(ledgerMinor(money)).toBe(9223372036854775807n);
    expect(formatLedgerMoney(money)).toBe('Q 92,233,720,368,547,758.07');
    expect(paymentMoney('25.5', 'GTQ')).toEqual({ amount: '25.50', currency: 'GTQ' });
    expect(paymentMoney('150', 'JPY')).toEqual({ amount: '150', currency: 'JPY' });
    expect(paymentMoney('1.234', 'KWD')).toEqual({ amount: '1.234', currency: 'KWD' });
  });
  it.each(['0', '-1', '1.001', '1e2', 'Infinity', '1,000', '92233720368547758.08'])('rejects invalid input %s', value => {
    expect(paymentMoney(value, 'GTQ')).toBeNull();
  });
  it('validates scope, required nullable fields and currency consistency', () => {
    const dto = staffFolioFixture();
    expect(mapStaffFolioDetail(dto, folioProperty, folioId).balance.amount).toBe('100.00');
    for (const value of [{ ...dto, folio: { ...dto.folio, propertyId: folioReservation } },
      { ...dto, balance: { amount: '100.00', currency: 'USD' } }, { ...dto, movementCount: -1 },
      { ...dto, folio: { ...dto.folio, stayId: undefined } }, { ...dto, balance: { amount: 100, currency: 'GTQ' } }]) {
      expect(() => mapStaffFolioDetail(value, folioProperty, folioId)).toThrow(DomainMappingError);
    }
    expect(mapStaffFolioDetail({ ...dto, movementCount: 0, balance: { amount: '0.00', currency: 'GTQ' } }, folioProperty, folioId).movementCount).toBe(0);
    expect(() => mapStaffFolioDetail({ ...dto, folio: { ...dto.folio, type: ['GUEST'] } }, folioProperty, folioId)).toThrow(DomainMappingError);
    expect(mapStaffFolioDetail({ ...dto, folio: { ...dto.folio, holderLabel: '' } }, folioProperty, folioId).folio.holderLabel).toBe('');
  });
  it('rejects wrong reservation, duplicate rows and missing cursor in list', () => {
    const page = { propertyId: folioProperty, reservationId: folioReservation, items: [staffFolioFixture().folio], nextCursor: null };
    expect(mapStaffFolioPage(page, folioProperty, folioReservation).items).toHaveLength(1);
    for (const dto of [{ ...page, reservationId: folioId }, { ...page, items: [...page.items, ...page.items] }, { ...page, nextCursor: undefined }])
      expect(() => mapStaffFolioPage(dto, folioProperty, folioReservation)).toThrow(DomainMappingError);
  });
  it('preserves signed movements and rejects payment with charge sign', () => {
    const movement = { id: movementId, folioId, kind: 'PAYMENT', amount: { amount: '-25.50', currency: 'GTQ' }, description: 'Efectivo', reversesId: null, createdBy: null, createdAt: '2026-10-26T18:00:00Z' };
    const page = { propertyId: folioProperty, folioId, items: [movement], nextCursor: null };
    expect(ledgerMinor(mapStaffMovementPage(page, folioProperty, folioId).items[0].amount)).toBe(-2550n);
    expect(() => mapStaffMovementPage({ ...page, items: [{ ...movement, amount: { amount: '25.50', currency: 'GTQ' } }] }, folioProperty, folioId)).toThrow(DomainMappingError);
  });
  it('allowlists receipt fields without presenting a current balance or upstream secrets', () => {
    const receipt = paymentReceiptFixture();
    expect(mapStaffPaymentReceipt({ ...receipt, secret: 'private', balance: '75.00' }, folioProperty, folioId)).toEqual(receipt);
    expect(() => mapStaffPaymentReceipt({ ...receipt, folioId: folioReservation }, folioProperty, folioId)).toThrow(DomainMappingError);
  });
});
