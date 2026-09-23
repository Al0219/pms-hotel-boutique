import { delay, http, HttpResponse } from "msw";
import type { GuestAccountDTO } from "@/modules/auth/dtos/guest-account.dto";
import type { AccountSummaryDTO } from "@/modules/account/dtos/account.dto";

/** Frontend-only fixtures for IMP-WEB-0202. No authentication or Backend API contract. */
export const guestAccessHandlers = [
  http.post("http://pms.test/__mock/guest-access", async ({ request }) => {
    const input = await request.json() as { method?: string; email?: unknown };
    await delay(400);
    if (input.method !== "EMAIL" && input.method !== "GOOGLE") {
      return HttpResponse.json({ code: "INVALID_ACCESS_REQUEST" }, { status: 400 });
    }
    if (input.method === "EMAIL" && (typeof input.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))) {
      return HttpResponse.json({ code: "INVALID_ACCESS_REQUEST" }, { status: 400 });
    }
    const email = input.method === "EMAIL" ? (input.email as string).trim() : "guest.google@example.com";
    if (email.toLowerCase() === "error@example.com") {
      return HttpResponse.json({ code: "ACCESS_UNAVAILABLE" }, { status: 503 });
    }
    if (email.toLowerCase() === "offline@example.com") return HttpResponse.error();
    const account: GuestAccountDTO = {
      account_id: "guest-demo-01",
      email,
      external_identities: input.method === "GOOGLE" ? [{ provider: "GOOGLE", external_subject: "google-demo-01", connected_at: "2026-09-23T12:00:00.000Z" }] : [],
    };
    return HttpResponse.json(account);
  }),
  // Existing provisional account summary transport; mock payload only.
  http.get("http://pms.test/account/summary", ({ request }) => {
    if (new URL(request.url).searchParams.get("accountId") !== "guest-demo-01") {
      return HttpResponse.json({ code: "ACCOUNT_UNAVAILABLE" }, { status: 404 });
    }
    const summary: AccountSummaryDTO = {
      account_id: "guest-demo-01", guest_name: "Alan Palacios", email: "guest@example.com",
      access_method: "Correo electrónico", is_active: true, linked_reservations_count: 1,
      upcoming_stay: { reservation_code: "HB-2026-09117", rooms_count: 2, dates_label: "12–15 sep.", summary_text: "Consulta el detalle y huéspedes asignados." },
      profile_summary: { name: "Alan Palacios", preferred_language: "Español", description: "Datos personales, privacidad y preferencias de estancia." },
      invoices_summary: { available_documents_count: 2, description: "Consulta comprobantes asociados a tus estadías." },
      rewards_summary: { tier_name: "Silver", current_nights: 3, target_nights: 8, next_tier_name: "Gold", active_benefits_count: 3, description: "Consulta progreso, condiciones y próximos hitos." },
      messages_summary: { unread_count: 0, description: "La comunicación con el hotel se centraliza en Recepción." },
      promotions_summary: { eligible_offers_count: 1, featured_offer_title: "Member Rate -5%", description: "Sujeto a fechas, Rate Plan y disponibilidad." },
    };
    return HttpResponse.json(summary);
  }),
];
