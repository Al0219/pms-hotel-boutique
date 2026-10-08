import type { AvailabilityResponseDto, AvailableRoomTypeDto } from "@/modules/availability";

// Editorial demonstration data only. Never used as live hotel inventory.
const rooms: AvailableRoomTypeDto[] = [
  { room_type_id: "rt_deluxe_king", name: "Deluxe King", code: "DLX-KNG", category: "DELUXE", bed_description: "King", area_square_meters: 32, max_occupancy: 2, available_rooms_count: 2,
    description: "Un espacio luminoso y tranquilo, con detalles cálidos y vistas al jardín.", amenities: ["Wi-Fi", "A/C", "Minibar"], badge: "Más popular", images: [], rate_plans: [
      { rate_plan_id: "rp_flexible", rate_plan_name: "Tarifa flexible", description: null, base_nightly_rate: "145.00", total_amount: "435.00", currency: "USD", cancellation_policy: "Cancelación gratuita hasta 48h antes del check-in.", meals_included: "Desayuno incluido" },
      { rate_plan_id: "rp_non_refundable", rate_plan_name: "Tarifa no reembolsable", description: null, base_nightly_rate: "130.00", total_amount: "390.00", currency: "USD", cancellation_policy: "No reembolsable en caso de cancelación o no-show.", meals_included: null },
    ] },
  { room_type_id: "rt_terrace_suite", name: "Suite Terraza", code: "STE-TER", category: "SUITE", bed_description: "King", area_square_meters: 48, max_occupancy: 2, available_rooms_count: 1,
    description: "Una suite amplia para disfrutar de la calma y de tu propia terraza.", amenities: ["Wi-Fi", "A/C", "Terraza", "Minibar"], badge: "Terraza privada", images: [], rate_plans: [
      { rate_plan_id: "rp_terrace", rate_plan_name: "Tarifa flexible", description: null, base_nightly_rate: "210.00", total_amount: "630.00", currency: "USD", cancellation_policy: "Cancelación gratuita hasta 48h antes del check-in.", meals_included: "Desayuno incluido" },
    ] },
  { room_type_id: "rt_double_superior", name: "Doble Superior", code: "SUP-DBL", category: "SUPERIOR", bed_description: "2 camas dobles", area_square_meters: 28, max_occupancy: 2, available_rooms_count: 2,
    description: "Comodidad compartida en una habitación serena, práctica y acogedora.", amenities: ["Wi-Fi", "A/C"], badge: "Vista al jardín", images: [], rate_plans: [
      { rate_plan_id: "rp_superior", rate_plan_name: "Tarifa flexible", description: null, base_nightly_rate: "125.00", total_amount: "375.00", currency: "USD", cancellation_policy: "Cancelación gratuita hasta 48h antes del check-in.", meals_included: null },
    ] },
  { room_type_id: "rt_junior_suite", name: "Junior Suite", code: "STE-JNR", category: "SUITE", bed_description: "King y sofá cama", area_square_meters: 40, max_occupancy: 4, available_rooms_count: 2,
    description: "Más espacio para una estancia en familia, con una cómoda zona de descanso.", amenities: ["Wi-Fi", "A/C", "Minibar"], images: [], rate_plans: [
      { rate_plan_id: "rp_junior", rate_plan_name: "Tarifa flexible", description: null, base_nightly_rate: "175.00", total_amount: "525.00", currency: "USD", cancellation_policy: "Cancelación gratuita hasta 48h antes del check-in.", meals_included: "Desayuno incluido" },
    ] },
];

const imageNames = ['deluxe-king', 'terrace-suite', 'double-superior', 'junior-suite'];
const flexibleTerms = [
  { window_label: 'Hasta 72 h antes', penalty_percent: 0 },
  { window_label: '48–72 h antes', penalty_percent: 50 },
  { window_label: 'Menos de 48 h', penalty_percent: 100 },
];

export const publicCatalogueFixture: AvailabilityResponseDto = {
  property_id: "prop_boutique_01", check_in_date: "2026-10-01", check_out_date: "2026-10-04", total_nights: 3,
  available_room_types: rooms.map((room, index) => ({
    ...room, view_description: index === 1 ? 'Terraza privada' : 'Vista al jardín',
    amenities: ['Wi-Fi de alta velocidad', 'Aire acondicionado', 'Smart TV', 'Caja de seguridad', 'Servicio de limpieza', ...(room.amenities?.filter(value => !['Wi-Fi', 'A/C'].includes(value)) ?? [])],
    images: [1, 2, 3].map(n => `/images/rooms/demo/${imageNames[index]}${n === 1 ? '' : `-${n}`}.webp`),
    rate_plans: room.rate_plans.map(rate => ({
      ...rate,
      // User-approved visual example for a three-night demo quote, not tax law.
      stay_price_breakdown: { service_charge: '22.00', estimated_taxes: '48.00', estimated_total: (Number(rate.total_amount) + 70).toFixed(2) },
      cancellation_policy: rate.rate_plan_id === 'rp_non_refundable' ? rate.cancellation_policy : 'Hasta 72 h antes: sin cargo. Entre 48 y 72 h: 50% del total. Menos de 48 h: total de la reserva.',
      cancellation_terms: rate.rate_plan_id === 'rp_non_refundable' ? [{ window_label: 'En cualquier momento', penalty_percent: 100 }] : flexibleTerms,
    })),
  })),
};
