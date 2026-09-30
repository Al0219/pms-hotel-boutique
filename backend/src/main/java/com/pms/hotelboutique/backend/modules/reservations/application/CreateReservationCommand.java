package com.pms.hotelboutique.backend.modules.reservations.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Input for creating a {@code Reservation} container.
 *
 * Stays are added by Fase 3 flows; Fase 2 only opens the container in
 * PENDING state. No REST contract is implied.
 */
public record CreateReservationCommand(
        @NotNull UUID propertyId,
        UUID bookingGuestId,
        @NotBlank @Pattern(regexp = "^[A-Z]{3}$") String currency,
        @NotBlank @Size(max = 64) String sourceChannel,
        @Size(max = 128) String sourceReference,
        @Size(max = 1000) String notes) {
}
