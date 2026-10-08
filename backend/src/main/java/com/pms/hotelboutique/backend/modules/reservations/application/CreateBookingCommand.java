package com.pms.hotelboutique.backend.modules.reservations.application;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Single-transaction booking input (Fase 4).
 *
 * Booker and occupants accept either an existing profile id or inline data
 * for a new profile (exactly one of the two). No REST contract is implied.
 */
public record CreateBookingCommand(
        @NotNull UUID propertyId,
        @Valid BookerBooking booker,
        @NotBlank @Pattern(regexp = "^[A-Z]{3}$") String currency,
        @NotBlank @Size(max = 64) String sourceChannel,
        @Size(max = 128) String sourceReference,
        @Size(max = 1000) String notes,
        @NotNull @Size(min = 1) List<@Valid StayBookingCommand> stays) {

    public record BookerBooking(UUID profileId, @Valid CreateGuestProfileCommand newProfile) {
    }

    public record StayBookingCommand(
            @NotNull UUID roomTypeId,
            UUID roomId,
            @NotNull LocalDate arrival,
            @NotNull LocalDate departure,
            @NotNull List<@Valid OccupantBooking> occupants) {
    }

    public record OccupantBooking(UUID profileId, @Valid CreateGuestProfileCommand newProfile,
            boolean primary) {
    }
}
