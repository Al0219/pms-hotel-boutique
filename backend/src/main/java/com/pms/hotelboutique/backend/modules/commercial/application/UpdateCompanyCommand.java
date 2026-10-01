package com.pms.hotelboutique.backend.modules.commercial.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Input for updating {@code Company} contact data. Code/property are immutable. */
public record UpdateCompanyCommand(
        @NotBlank @Size(max = 160) String name,
        @Size(max = 64) String taxId,
        @Size(max = 320) String email,
        @Size(max = 32) String phone) {
}
