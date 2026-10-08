package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.commercial.domain.Agency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Input for updating {@code Agency} contact data. Code/property are immutable. */
public record UpdateAgencyCommand(
        @NotBlank @Size(max = 160) String name,
        Agency.CommissionModel commissionModel,
        @Size(max = 320) String email,
        @Size(max = 32) String phone) {
}
