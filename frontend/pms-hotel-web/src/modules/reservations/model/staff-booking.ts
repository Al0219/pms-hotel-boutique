export interface StaffBookingSearch { arrival: string; departure: string; rooms: number }
export interface StaffBookingGuest { firstName: string; lastName: string; email: string; phone: string }
export interface StaffBookingOption { roomTypeId: string; roomTypeName: string; ratePlanId: string; availableRooms: number; nightlyMinor: number; totalMinor: number }
export interface StaffBookingQuote extends StaffBookingSearch { propertyId: string; nights: number; currency: string; options: StaffBookingOption[] }
export interface StaffBookingReceipt { operationId: string; propertyId: string; reservationId: string; completedAt: string }
