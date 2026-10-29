package com.pms.hotelboutique.backend.modules.guestauth.application;

import java.time.Instant;
import java.util.UUID;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(requiredProperties={"guestAccountId","email","profile"})
public record GuestPersonalProfile(UUID guestAccountId, String email, Details profile) {
    @Schema(name="GuestPersonalProfileDetails", requiredProperties={"profileId","firstName","lastName","phone","country","preferredLanguage","bedType","roomVibe","floorPreference","version","updatedAt"})
    public record Details(UUID profileId, String firstName, String lastName,
        @Schema(types={"string","null"}) String phone, @Schema(types={"string","null"}) String country,
        @Schema(types={"string","null"}, allowableValues={"es","en"}) String preferredLanguage,
        @Schema(types={"string","null"}, allowableValues={"KING","QUEEN","TWIN"}) String bedType,
        @Schema(types={"string","null"}, allowableValues={"QUIET","EXTERIOR_VIEW","NEAR_ELEVATOR"}) String roomVibe,
        @Schema(types={"string","null"}, allowableValues={"HIGH","LOW"}) String floorPreference, long version, Instant updatedAt) {
        @Override public String toString() { return "GuestPersonalProfileDetails[redacted]"; }
    }
    @Override public String toString() { return "GuestPersonalProfile[redacted]"; }
}
