/**
 * DOMAIN MODEL - Sell Limits & Overbooking (WEB-4).
 * Regla de dominio: Physical Room count no cambia; ATS se recalcula.
 */

export interface SellLimit {
  limitId: string;
  propertyId: string;
  roomTypeId: string;
  roomTypeName: string;
  date: string; // ISO Date YYYY-MM-DD
  physicalRoomsCount: number; // Capacidad física inmutable
  oooRoomsCount: number; // Habitaciones fuera de orden
  oosRoomsCount: number; // Habitaciones fuera de servicio
  soldRoomsCount: number; // Habitaciones ocupadas / vendidas
  overbookingLimit: number; // Margen de sobreventa (>= 0)
  sellLimit: number | null; // Tope máximo de venta manual (opcional)
  calculatedATS: number; // Capacidad vendible calculada
  updatedAt: Date;
}

export interface UpdateSellLimitParams {
  propertyId: string;
  roomTypeId: string;
  date: string;
  overbookingLimit: number;
  sellLimit: number | null;
}

/**
 * Función pura de cálculo de disponibilidad vendible (ATS):
 * 1. Base vendible = max(0, Physical - OOO - OOS - Sold)
 * 2. Con overbooking = max(0, Base + OverbookingLimit)
 * 3. Si existe SellLimit manual = min(SellLimit, ConOverbooking)
 */
export function calculateSellableATS(
  physicalRooms: number,
  oooRooms: number,
  oosRooms: number,
  soldRooms: number,
  overbookingLimit: number,
  sellLimit: number | null = null,
): number {
  const baseAvailable = Math.max(0, physicalRooms - oooRooms - oosRooms - soldRooms);
  const withOverbooking = Math.max(0, baseAvailable + Math.max(0, overbookingLimit));

  if (sellLimit !== null && sellLimit !== undefined && sellLimit >= 0) {
    return Math.min(sellLimit, withOverbooking);
  }

  return withOverbooking;
}
