export const folioProperty = '11111111-1111-4111-8111-111111111111';
export const folioReservation = '22222222-2222-4222-8222-222222222222';
export const folioId = '33333333-3333-4333-8333-333333333333';
export const folioActor = '44444444-4444-4444-8444-444444444444';
export const movementId = '55555555-5555-4555-8555-555555555555';
export function staffFolioFixture() {
  return { folio: { id: folioId, propertyId: folioProperty, type: 'GUEST', status: 'OPEN', reservationId: folioReservation,
    stayId: null, groupId: null, currency: 'GTQ', holderLabel: 'Cuenta de recepción', createdAt: '2026-10-26T18:00:00Z', updatedAt: '2026-10-26T18:00:00Z' },
  balance: { amount: '100.00', currency: 'GTQ' }, movementCount: 1 };
}
export function paymentReceiptFixture(amount = '25.50') {
  return { operationId: folioActor, propertyId: folioProperty, folioId, movementId, amount: { amount, currency: 'GTQ' }, completedAt: '2026-10-26T18:01:00.123456Z' };
}
export const receivedPaymentFixture = { amount: { amount: '25.50', currency: 'GTQ' }, description: 'Efectivo recibido' };
