package com.pms.hotelboutique.backend.modules.reservations.application;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Input for creating a {@code GuestProfile}.
 *
 * Account and property links are optional: a profile may exist standalone
 * (for example a walk-in occupant) and be linked later by future flows.
 * No REST contract is implied; the HTTP API will be confirmed separately.
 */
public record CreateGuestProfileCommand(
        UUID guestAccountId,
        UUID propertyId,
        @NotBlank @Size(max = 80) String firstName,
        @NotBlank @Size(max = 80) String lastName,
        @Size(max = 320) @Email String email,
        @Size(max = 32) String phone,
        @Size(max = 16) String documentType,
        @Size(max = 64) String documentNumber,
        @Size(max = 8) String preferredLanguage) {
}
