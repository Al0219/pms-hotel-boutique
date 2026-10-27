/** Confirmed Backend61 JSON. Runtime validation remains mandatory before consumption. */
export interface LedgerMoneyDto { amount: string; currency: string }
export interface StaffFolioDto {
  id: string; propertyId: string; type: 'GUEST' | 'COMPANY' | 'MASTER'; status: 'OPEN' | 'SETTLED' | 'CLOSED';
  reservationId: string | null; stayId: string | null; groupId: string | null; currency: string;
  holderLabel: string | null; createdAt: string; updatedAt: string;
}
export interface StaffFolioDetailDto { folio: StaffFolioDto; balance: LedgerMoneyDto; movementCount: number }
export interface StaffFolioPageDto { propertyId: string; reservationId: string; items: StaffFolioDto[]; nextCursor: string | null }
export interface StaffMovementDto {
  id: string; folioId: string; kind: 'CHARGE' | 'PAYMENT' | 'ADJUSTMENT'; amount: LedgerMoneyDto;
  description: string; reversesId: string | null; createdBy: string | null; createdAt: string;
}
export interface StaffMovementPageDto { propertyId: string; folioId: string; items: StaffMovementDto[]; nextCursor: string | null }
export interface StaffPaymentReceiptDto {
  operationId: string; propertyId: string; folioId: string; movementId: string; amount: LedgerMoneyDto; completedAt: string;
}
export interface ReceivedPaymentDto { amount: LedgerMoneyDto; description: string }
