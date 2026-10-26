/** Current shared Web/Android contract; ownership is resolved only by Backend. */
export const guestHistoryAccount = '11111111-1111-4111-8111-111111111111';
export const guestHistorySession = { guestAccountId: guestHistoryAccount, sessionId: '22222222-2222-4222-8222-222222222222', email: 'guest@example.test', context: 'GUEST' };
export const guestHistoryReservation = {
  reservationId: '33333333-3333-4333-8333-333333333333', confirmationCode: 'HB-2026-08421',
  stayId: '55555555-5555-4555-8555-555555555555', propertyName: 'Hotel Boutique', reservationStatus: 'CONFIRMED',
  arrival: '2026-12-28', departure: '2026-12-31', status: 'RESERVED', roomCode: null,
};
export const guestHistoryPage = [guestHistoryReservation];
export const guestLinkRequestId = '77777777-7777-4777-8777-777777777777';
