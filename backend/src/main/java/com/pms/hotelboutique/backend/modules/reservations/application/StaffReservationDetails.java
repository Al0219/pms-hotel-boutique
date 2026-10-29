package com.pms.hotelboutique.backend.modules.reservations.application;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Detail-only operational projection; never part of the reservation list. */
@Schema(description = "Additional data for one authorized Staff reservation; absent from list responses", requiredProperties = {"updatedAt", "notes", "contact", "stays"})
public record StaffReservationDetails(
        Instant updatedAt,
        @Schema(types = {"string", "null"}, description = "Recorded reservation notes; never inferred from a Guest account") String notes,
        @Schema(nullable = true) Contact contact,
        List<StayGuests> stays) {
    @Schema(name = "StaffReservationContact", requiredProperties = {"profileId", "email", "phone", "documentType", "documentNumberMasked", "preferredLanguage", "country"})
    public record Contact(UUID profileId,
            @Schema(types = {"string", "null"}) String email,
            @Schema(types = {"string", "null"}) String phone,
            @Schema(types = {"string", "null"}) String documentType,
            @Schema(types = {"string", "null"}, description = "Masked document, at most the final four characters; never the original document") String documentNumberMasked,
            @Schema(types = {"string", "null"}) String preferredLanguage,
            @Schema(types = {"string", "null"}, description = "Recorded ISO alpha-2 country/region; null for historical profiles without this field") String country) { }
    @Schema(name = "StaffReservationStayGuests", requiredProperties = {"stayId", "occupants"})
    public record StayGuests(UUID stayId,
            @Schema(description = "Explicitly registered occupants; empty is not an inferred occupancy count") List<Occupant> occupants) { }
    @Schema(name = "StaffReservationOccupant", requiredProperties = {"profileId", "fullName", "primary"})
    public record Occupant(UUID profileId, String fullName, boolean primary) { }
}
