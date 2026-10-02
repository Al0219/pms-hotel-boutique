package com.pms.hotelboutique.backend.modules.commercial.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

/** Input for creating an {@code EventGroup}. No REST contract is implied. */
public record CreateEventGroupCommand(
        @NotNull UUID propertyId,
        @NotBlank @Size(max = 64) String code,
        @NotBlank @Size(max = 160) String name,
        UUID companyId,
        UUID agencyId,
        @NotNull LocalDate arrival,
        @NotNull LocalDate departure,
        LocalDate cutoffDate) {
}
