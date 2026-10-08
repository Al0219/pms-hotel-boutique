package com.pms.hotelboutique.backend.modules.commercial.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

/** Input for updating {@code EventGroup} details. Code/dates/property are immutable. */
public record UpdateEventGroupCommand(
        @NotBlank @Size(max = 160) String name,
        UUID companyId,
        UUID agencyId,
        LocalDate cutoffDate) {
}
