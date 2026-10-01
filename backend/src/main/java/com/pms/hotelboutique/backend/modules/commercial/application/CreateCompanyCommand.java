package com.pms.hotelboutique.backend.modules.commercial.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** Input for creating a {@code Company}. No REST contract is implied. */
public record CreateCompanyCommand(
        @NotNull UUID propertyId,
        @NotBlank @Size(max = 64) String code,
        @NotBlank @Size(max = 160) String name,
        @Size(max = 64) String taxId,
        @Size(max = 320) String email,
        @Size(max = 32) String phone) {
}
