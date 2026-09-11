/**
 * Domain Models for Availability & ATS
 * Conforme a las reglas de dominio:
 * - Physical Inventory != Sellable Availability (ATS).
 * - RatePlan no posee inventario físico.
 * - Separación limpia de amount y currency (number para cálculo).
 */

export interface AvailabilitySearchParams {
  propertyId?: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  roomsCount: number;
}

export interface RatePlanOption {
  ratePlanId: string;
  name: string;
  description: string | null;
  baseNightlyRate: number;
  totalAmount: number;
  currency: string;
  cancellationPolicy: string;
  mealsIncluded: string | null;
}

export interface AvailableRoomType {
  roomTypeId: string;
  name: string;
  code: string;
  description: string | null;
  maxOccupancy: number;
  availableRoomsCount: number; // ATS (Available to sell) para la estancia
  ratePlans: RatePlanOption[];
  images: string[];
}

export interface AvailabilitySearchResult {
  propertyId: string;
  checkInDate: string;
  checkOutDate: string;
  totalNights: number;
  roomTypes: AvailableRoomType[];
}
