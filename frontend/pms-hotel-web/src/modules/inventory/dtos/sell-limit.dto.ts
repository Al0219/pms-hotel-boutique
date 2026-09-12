/**
 * PROVISIONAL API CONTRACT - Sell Limits & Overbooking (WEB-4).
 * Regla de dominio: Physical Room count permanece inalterado; el ATS es recalculado.
 */

export interface SellLimitDto {
  limit_id: string;
  property_id: string;
  room_type_id: string;
  room_type_name: string;
  date: string; // YYYY-MM-DD
  physical_rooms_count: number; // Invariable
  ooo_rooms_count: number; // Out of order
  oos_rooms_count: number; // Out of service
  sold_rooms_count: number; // Reservas confirmadas
  overbooking_limit: number; // Margen de sobreventa permitido (>= 0)
  sell_limit: number | null; // Tope máximo de venta manual (opcional)
  calculated_ats: number; // ATS Vendible final recalculado
  updated_at: string;
}

export interface UpdateSellLimitRequestDto {
  property_id: string;
  room_type_id: string;
  date: string;
  overbooking_limit: number;
  sell_limit: number | null;
}

export interface SellLimitListResponseDto {
  items: SellLimitDto[];
  total_count: number;
}
