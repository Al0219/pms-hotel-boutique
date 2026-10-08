import { describe, expect, it } from "vitest";

import { mapGuestProfile } from "./profile.mapper";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

describe("profile.mapper", () => {
  it("maps valid GuestProfileDTO correctly", () => {
    const dto = {
      profile_id: "PRF-101",
      first_name: "Alan",
      last_name: "Palacios",
      email: "alan@email.com",
      phone: "+502 5555 5555",
      country: "Guatemala",
      preferred_language: "Español",
      preferences: {
        bed_type: "King",
        room_vibe: "tranquila",
        floor_preference: "Piso alto · evitar zonas ruidosas",
        privacy_level: "SOLO CUENTA",
        revocable_consent: true,
      },
    };

    const domain = mapGuestProfile(dto);
    expect(domain.id).toBe("PRF-101");
    expect(domain.firstName).toBe("Alan");
    expect(domain.preferences.bedType).toBe("King");
  });

  it("throws DomainMappingError when first_name is missing", () => {
    expect(() =>
      mapGuestProfile({
        profile_id: "PRF-101",
        first_name: "",
        last_name: "Palacios",
        email: "alan@email.com",
        phone: "+502 5555 5555",
      } as any)
    ).toThrow(DomainMappingError);
  });
});
