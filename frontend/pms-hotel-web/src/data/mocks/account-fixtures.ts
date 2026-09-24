import type { AccountSummaryDTO } from "@/modules/account/dtos/account.dto";
import type { GuestReservationDTO } from "@/modules/account/dtos/guest-reservation.dto";
import type { GuestInvoiceDTO } from "@/modules/account/dtos/invoice.dto";
import type { GuestProfileDTO } from "@/modules/profile/dtos/profile.dto";
import type { RewardsProgramDTO } from "@/modules/rewards/dtos/rewards.dto";
import type { PromotionDTO } from "@/modules/promotions/dtos/promotions.dto";

export interface AccountFixture {
  accountId: string;
  accessEmail: string;
  profile: GuestProfileDTO;
  reservations: GuestReservationDTO[];
  rewards: RewardsProgramDTO;
  promotions: PromotionDTO[];
  invoices: GuestInvoiceDTO[];
}
const accounts = new Map<string, AccountFixture>();
export const demoAccountIds = ["guest-demo-01", "guest-demo-empty", "guest-demo-data-error", "guest-demo-data-offline", "guest-demo-save-error"];

export function initializeAccountFixture(accountId: string, email: string): AccountFixture {
  const empty = accountId === "guest-demo-empty";
  const profileId = `profile-${accountId}`;
  const profile: GuestProfileDTO = { profile_id: profileId, first_name: "Alan", last_name: "Palacios", email, phone: "+502 5555 5555", country: "Guatemala", preferred_language: "Español",
    preferences: { bed_type: "King", room_vibe: "tranquila", floor_preference: "Piso alto · evitar zonas ruidosas", privacy_level: "SOLO CUENTA", revocable_consent: true } };
  const reservations: GuestReservationDTO[] = empty ? [] : [
    { reservation_id: "HB-2026-09117", property_id: "GT-HB-01", property_name: "Hotel Boutique Antigua", booking_guest: "Alan Palacios", period: "CURRENT", status_code: "CONFIRMED", status_label: "Confirmada", policy: "Consulta las condiciones de tu confirmación.", stays: [
      { stay_id: "ST-09117-01", room_type: "Deluxe King", arrival: "2026-10-12", departure: "2026-10-15", status_code: "RESERVED", status_label: "Reservada", occupants: [{ guest_profile_id: profileId, name: "Alan Palacios" }] },
      { stay_id: "ST-09117-02", room_type: "Superior Twin", arrival: "2026-10-12", departure: "2026-10-15", status_code: "RESERVED", status_label: "Reservada", occupants: [{ guest_profile_id: "profile-occupant-02", name: "María López" }] },
    ] },
    { reservation_id: "HB-2026-07214", property_id: "GT-HB-02", property_name: "Hotel Boutique Ciudad", booking_guest: "Alan Palacios", period: "PAST", status_code: "CONFIRMED", status_label: "Confirmada", policy: "Estadía finalizada.", stays: [
      { stay_id: "ST-07214-01", room_type: "Deluxe King", arrival: "2026-07-14", departure: "2026-07-16", status_code: "CHECKED_OUT", status_label: "Salida completada", occupants: [{ guest_profile_id: profileId, name: "Alan Palacios" }] },
    ] },
    { reservation_id: "HB-2026-08055", property_id: "GT-HB-01", property_name: "Hotel Boutique Antigua", booking_guest: "Alan Palacios", period: "PAST", status_code: "CANCELLED", status_label: "Cancelada", policy: "Reserva cancelada; no genera actividad elegible de estadía.", stays: [
      { stay_id: "ST-08055-01", room_type: "Superior", arrival: "2026-08-05", departure: "2026-08-07", status_code: "CANCELLED", status_label: "Cancelada", occupants: [] },
    ] },
    { reservation_id: "HB-2026-08112", property_id: "GT-HB-01", property_name: "Hotel Boutique Antigua", booking_guest: "Alan Palacios", period: "PAST", status_code: "NO_SHOW", status_label: "No-show", policy: "Inasistencia; no genera actividad elegible de estadía.", stays: [
      { stay_id: "ST-08112-01", room_type: "Superior", arrival: "2026-09-01", departure: "2026-09-03", status_code: "NO_SHOW", status_label: "No-show", occupants: [] },
    ] },
  ];
  const rewards: RewardsProgramDTO = { account_id: accountId, current_tier: empty ? "Member" : "Silver", current_nights: empty ? 0 : 3, target_nights: 8, next_tier: "Gold", points_balance: empty ? 0 : 120,
    benefits: empty ? [] : [
      { id: "BEN-01", title: "Late Check-out Preferencial", description: "Sujeto a disponibilidad de la propiedad.", is_active: true },
      { id: "BEN-02", title: "Member Rate", description: "Consulta condiciones en Promociones.", is_active: true },
      { id: "BEN-03", title: "Amenidad de Bienvenida", description: "Consulta disponibilidad al llegar.", is_active: true },
    ], ledger: empty ? [] : [
      { id: "LED-01", type: "EARN", points: 200, date: "2026-07-16", description: "Abono de demostración por estadía completada", reservation_id: "HB-2026-07214" },
      { id: "LED-02", type: "REDEEM", points: 50, date: "2026-08-01", description: "Canje de demostración", reservation_id: null },
      { id: "LED-03", type: "EXPIRE", points: 10, date: "2026-08-15", description: "Vencimiento de demostración", reservation_id: null },
      { id: "LED-04", type: "REVERSE", points: 20, date: "2026-09-01", description: "Reversión de abono de demostración", reservation_id: "HB-2026-07214" },
    ] };
  const promotions: PromotionDTO[] = empty ? [] : [
    { code: "MEMBER5", title: "Member Rate -5%", discount_percentage: 5, description: "Oferta para miembros en canales directos.", is_eligible: true, conditions: "Sujeto a fechas, Rate Plan y disponibilidad.", valid_from: "2026-09-01", valid_until: "2026-12-31", status_label: "Vigente", eligibility_reason: null, combinable: false, combination_reason: "No combina con LONGSTAY15 en este escenario." },
    { code: "LONGSTAY15", title: "Estancia Larga · 15% Descuento", discount_percentage: 15, description: "Oferta de estancia larga.", is_eligible: false, conditions: "Requiere al menos 4 noches y 7 días de anticipación.", valid_from: "2026-09-01", valid_until: "2026-12-31", status_label: "Vigente", eligibility_reason: "El escenario consultado no cumple el mínimo de noches.", combinable: false, combination_reason: "Incompatible con MEMBER5." },
    { code: "SUMMER10", title: "Temporada anterior", discount_percentage: 10, description: "Oferta de demostración finalizada.", is_eligible: false, conditions: "Solo para el período indicado.", valid_from: "2026-06-01", valid_until: "2026-08-31", status_label: "Vencida", eligibility_reason: "Fuera de vigencia.", combinable: null, combination_reason: null },
  ];
  const invoices: GuestInvoiceDTO[] = empty ? [] : [{ id: "FACT-2026-07214", reservation_id: "HB-2026-07214", issued_on: "2026-07-16", amount_label: "Q 2,180.00", status_label: "Consulta disponible", download_path: null }];
  const data = { accountId, accessEmail: email, profile, reservations, rewards, promotions, invoices };
  accounts.set(accountId, data);
  return data;
}
export function getAccountFixture(id: string | null) {
  if (!id || !demoAccountIds.includes(id)) return undefined;
  return accounts.get(id) ?? initializeAccountFixture(id, "demo@example.com");
}
export function resetAccountFixtures() { accounts.clear(); }

/** Summary derives from the same records as the detail screens. No reward/price engine. */
export function summarizeAccount(data: AccountFixture): AccountSummaryDTO {
  const current = data.reservations.find(item => item.period === "CURRENT");
  const name = `${data.profile.first_name} ${data.profile.last_name}`;
  const eligible = data.promotions.filter(item => item.is_eligible);
  return { account_id: data.accountId, profile_id: data.profile.profile_id, guest_name: name, email: data.accessEmail, access_method: "Demo", is_active: true,
    linked_reservations_count: data.reservations.length,
    upcoming_stay: current ? { reservation_code: current.reservation_id, rooms_count: current.stays.length, dates_label: `${current.stays[0].arrival} → ${current.stays[0].departure}`, summary_text: current.property_name } : null,
    profile_summary: { name, preferred_language: data.profile.preferred_language, description: "Datos de contacto y preferencias de estancia." },
    invoices_summary: { available_documents_count: data.invoices.length, description: "Documentos asociados a tus reservas." },
    rewards_summary: { tier_name: data.rewards.current_tier, current_nights: data.rewards.current_nights, target_nights: data.rewards.target_nights, next_tier_name: data.rewards.next_tier, active_benefits_count: data.rewards.benefits.filter(b => b.is_active).length, description: "Consulta saldo e historial de puntos." },
    messages_summary: { unread_count: 0, description: "Consulta tus conversaciones con Recepción." },
    promotions_summary: { eligible_offers_count: eligible.length, featured_offer_title: eligible[0]?.title ?? "", description: "Consulta vigencia y condiciones." } };
}
