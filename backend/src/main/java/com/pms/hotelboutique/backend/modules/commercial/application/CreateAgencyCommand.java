package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.commercial.domain.Agency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** Input for creating an {@code Agency}. No REST contract is implied. */
public record CreateAgencyCommand(
        @NotNull UUID propertyId,
        @NotBlank @Size(max = 64) String code,
        @NotBlank @Size(max = 160) String name,
        Agency.CommissionModel commissionModel,
        @Size(max = 320) String email,
        @Size(max = 32) String phone) {
}
