package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.commercial.domain.Promotion;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

/** Input for creating a {@code Promotion}. No REST contract is implied. */
public record CreatePromotionCommand(
        @NotNull UUID propertyId,
        @NotBlank @Size(max = 64) String code,
        @NotBlank @Size(max = 160) String name,
        int priority,
        boolean stackable,
        @NotNull Promotion.BenefitType benefitType,
        @Positive long benefitValueMinor,
        LocalDate validFrom,
        LocalDate validTo) {
}
