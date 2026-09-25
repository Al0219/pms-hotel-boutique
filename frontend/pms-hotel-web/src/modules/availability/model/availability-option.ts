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

export interface AvailabilityMatrixQuery {
  propertyId: string;
  startDate: string;
  endDate: string;
  roomTypeId?: string;
}

export interface DailyRoomTypeAvailability {
  date: string;
  physicalRooms: number;
  soldRooms: number;
  oooRooms: number;
  oosRooms: number;
  overbookingAdjustment: number;
  ats: number;
  occupancyRate: number;
  stopSell: boolean;
  minLos?: number;
}

export interface RoomTypeMatrix {
  roomTypeId: string;
  roomTypeName: string;
  roomTypeCode: string;
  totalPhysicalCapacity: number;
  dailyAvailability: DailyRoomTypeAvailability[];
}

export interface PropertyDailySummary {
  date: string;
  totalPhysical: number;
  totalSold: number;
  totalOoo: number;
  totalOos: number;
  totalAts: number;
  averageOccupancyRate: number;
}

export interface AvailabilityMatrixResult {
  propertyId: string;
  startDate: string;
  endDate: string;
  dates: string[];
  matrix: RoomTypeMatrix[];
  totalPropertyPhysicalRooms: number;
  dailySummaries: PropertyDailySummary[];
}

