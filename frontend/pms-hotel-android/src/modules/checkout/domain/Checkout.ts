export interface FolioLineItem { label: string; quantity?: number; priceText: string; }
export type FolioAmountNature = 'CONFIRMED' | 'ESTIMATED';
export interface CheckoutTotal { amountMinor: number; currency: 'GTQ'; text: string; }
export interface FolioItem { key: string; label: string; priceText: string; lineItems?: readonly FolioLineItem[]; amountNature?: FolioAmountNature; }
export interface Folio { totalStayText: string; paidGuaranteeText: string; pendingBalanceText: string; items: readonly FolioItem[]; totalText: string; checkoutTotal?: CheckoutTotal; }
export interface CheckoutCheck { key: string; label: string; valueText: string; }
export interface CheckoutContent { roomDisplayText: string; stayDatesText: string; expectedDepartureText: string; checks: readonly CheckoutCheck[]; departureNoteText: string; }
export interface Invoice { documentTypeText: string; referenceText: string; totalText: string; statusText: string; dateText: string; }
export interface CheckoutRequest { departureNoteText?: string; }
