/** Contract fixtures: no mock prices, physical assignment or inferred ownership. */
export const guestHistoryAccount = '11111111-1111-4111-8111-111111111111';
export const guestHistorySession = { guestAccountId: guestHistoryAccount, sessionId: '22222222-2222-4222-8222-222222222222', email: 'guest@example.test', context: 'GUEST' };
export const guestHistoryReservation = {
  reservationId: '33333333-3333-4333-8333-333333333333', confirmationCode: 'HB-2026-08421', status: 'CONFIRMED',
  propertyId: '44444444-4444-4444-8444-444444444444', propertyName: 'Hotel Boutique', propertyTimeZone: 'America/Guatemala', bookingGuestName: 'Ana López',
  stays: [{ reservationStayId: '55555555-5555-4555-8555-555555555555', roomTypeId: '66666666-6666-4666-8666-666666666666', roomTypeName: 'Deluxe King', arrival: '2026-12-28', departure: '2026-12-31', status: 'RESERVED' as const }],
};
export const guestHistoryPage = { guestAccountId: guestHistoryAccount, page: 0, size: 20, totalElements: 1, items: [guestHistoryReservation] };
export const guestHistoryDetail = { guestAccountId: guestHistoryAccount, reservation: guestHistoryReservation };
export const guestLinkRequestId = '77777777-7777-4777-8777-777777777777';
