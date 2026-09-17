import { describe, expect, it } from "vitest";

import { mapAccountSummary, mapStayHistoryItem } from "./account.mapper";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

describe("account.mapper", () => {
  it("maps valid AccountSummaryDTO correctly", () => {
    const dto = {
      account_id: "ACC-01",
      guest_name: "Alan Palacios",
      email: "alan@email.com",
      access_method: "Google conectado",
      is_active: true,
      linked_reservations_count: 1,
      upcoming_stay: {
        reservation_code: "HB-2026-09117",
        rooms_count: 2,
        dates_label: "12–15 sep.",
        summary_text: "HB-2026-09117 · 2 habitaciones · 12–15 sep.",
      },
      profile_summary: {
        name: "Alan Palacios",
        preferred_language: "Español",
        description: "Datos personales, privacidad y preferencias",
      },
      invoices_summary: {
        available_documents_count: 2,
        description: "2 documentos disponibles",
      },
      rewards_summary: {
        tier_name: "Silver",
        current_nights: 3,
        target_nights: 8,
        next_tier_name: "Gold",
        active_benefits_count: 3,
        description: "Silver · 3/8 hacia Gold",
      },
      messages_summary: {
        unread_count: 0,
        description: "0 mensajes sin leer",
      },
      promotions_summary: {
        eligible_offers_count: 1,
        featured_offer_title: "Member Rate -5%",
        description: "1 oferta elegible · Member Rate -5%",
      },
    };

    const domain = mapAccountSummary(dto);
    expect(domain.accountId).toBe("ACC-01");
    expect(domain.guestName).toBe("Alan Palacios");
    expect(domain.upcomingStay?.reservationCode).toBe("HB-2026-09117");
    expect(domain.rewards.tierName).toBe("Silver");
  });

  it("throws DomainMappingError when account_id is missing", () => {
    expect(() =>
      mapAccountSummary({
        account_id: "",
        guest_name: "Alan",
        email: "alan@email.com",
      } as any)
    ).toThrow(DomainMappingError);
  });

  it("maps StayHistoryItemDTO correctly", () => {
    const dto = {
      reservation_code: "HB-2026-07214",
      room_category: "Deluxe King · 2 noches",
      nights_count: 2,
      total_amount_formatted: "Q 2,180",
      date_range_label: "14–16 jul 2026",
      guest_name: "Alan Palacios",
      stay_id: "ST-07214-01",
      status: "COMPLETADA" as const,
    };

    const domain = mapStayHistoryItem(dto);
    expect(domain.reservationCode).toBe("HB-2026-07214");
    expect(domain.totalAmountFormatted).toBe("Q 2,180");
    expect(domain.status).toBe("COMPLETADA");
  });
});
