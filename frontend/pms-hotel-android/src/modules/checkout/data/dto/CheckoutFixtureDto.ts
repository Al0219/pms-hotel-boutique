export interface FolioItemFixtureDto { fixtureKey: string; label: string; priceText: string; }
export interface FolioFixtureDto { totalStayText: string; paidGuaranteeText: string; pendingBalanceText: string; items: FolioItemFixtureDto[]; totalText: string; }
export interface CheckoutCheckFixtureDto { fixtureKey: string; label: string; valueText: string; }
export interface CheckoutFixtureDto { stay: { roomDisplayText: string; stayDatesText: string; expectedDepartureText: string }; checks: CheckoutCheckFixtureDto[]; departureNoteText: string; }
export interface InvoiceFixtureDto { documentTypeText: string; referenceText: string; totalText: string; statusText: string; dateText: string; }
