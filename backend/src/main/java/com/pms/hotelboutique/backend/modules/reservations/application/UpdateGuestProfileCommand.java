package com.pms.hotelboutique.backend.modules.reservations.application;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Contact-only update. Account and property links are immutable in Fase 1. */
public record UpdateGuestProfileCommand(
        @NotBlank @Size(max = 80) String firstName,
        @NotBlank @Size(max = 80) String lastName,
        @Size(max = 320) @Email String email,
        @Size(max = 32) String phone,
        @Size(max = 16) String documentType,
        @Size(max = 64) String documentNumber,
        @Size(max = 8) String preferredLanguage) {
}
